// app/api/bookings/[id]/payments/route.ts
// POST /api/bookings/:id/payments — record a payment (cash, transfer, Paystack, POS)

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { PaymentMethod } from '@prisma/client'

type Params = { params: { id: string } }

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const body = await req.json()

    const {
      amount,
      method,      // CASH | BANK_TRANSFER | CARD | PAYSTACK | POS
      reference,   // Paystack ref, bank transfer ref, etc.
      recordedBy,  // Staff ID
      notes,
    }: {
      amount: number
      method: PaymentMethod
      reference?: string
      recordedBy?: string
      notes?: string
    } = body

    if (!amount || !method) {
      return NextResponse.json({ error: 'Amount and payment method are required' }, { status: 400 })
    }

    if (amount <= 0) {
      return NextResponse.json({ error: 'Payment amount must be greater than 0' }, { status: 400 })
    }

    const booking = await prisma.booking.findUnique({
      where: { id: params.id },
      include: { payments: true },
    })

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Calculate how much is still owed
    const totalPaid = booking.payments
      .filter((p) => p.status === 'CONFIRMED')
      .reduce((sum, p) => sum + Number(p.amount), 0)

    const balance = Number(booking.totalAmount) - totalPaid

    if (amount > balance) {
      return NextResponse.json({
        error: `Payment of ₦${amount.toLocaleString()} exceeds remaining balance of ₦${balance.toLocaleString()}`,
        balance,
      }, { status: 400 })
    }

    // Record the payment
    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          bookingId: params.id,
          amount,
          method,
          reference,
          status: 'CONFIRMED',
          paidAt: new Date(),
          recordedBy,
          notes,
        },
      })

      const newTotalPaid = totalPaid + amount

      // Update amountPaid on the booking
      await tx.booking.update({
        where: { id: params.id },
        data: { amountPaid: newTotalPaid },
      })

      return { payment, newTotalPaid, balance: Number(booking.totalAmount) - newTotalPaid }
    })

    return NextResponse.json({
      success: true,
      payment: result.payment,
      summary: {
        totalCharged: booking.totalAmount,
        totalPaid: result.newTotalPaid,
        balance: result.balance,
        fullyPaid: result.balance === 0,
      },
    }, { status: 201 })

  } catch (error) {
    console.error('Payment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/bookings/:id/payments — list payments for a booking
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const payments = await prisma.payment.findMany({
      where: { bookingId: params.id },
      orderBy: { createdAt: 'asc' },
    })

    const total = payments
      .filter((p) => p.status === 'CONFIRMED')
      .reduce((sum, p) => sum + Number(p.amount), 0)

    return NextResponse.json({ payments, totalPaid: total })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
