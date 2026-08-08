import Razorpay from "razorpay";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return NextResponse.json(
      {
        error:
          "Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to your environment.",
      },
      { status: 503 },
    );
  }

  let body: { amount?: number; receipt?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const amount = body.amount;
  const receipt = body.receipt?.trim();

  if (typeof amount !== "number" || amount <= 0) {
    return NextResponse.json({ error: "A positive amount is required" }, { status: 400 });
  }
  if (!receipt) {
    return NextResponse.json({ error: "Order receipt id is required" }, { status: 400 });
  }

  const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });

  try {
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt: receipt.slice(0, 40),
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not create payment order";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
