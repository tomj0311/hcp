import { Router } from 'express';
import Stripe from 'stripe';

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test');

router.post('/checkout-session', async (req,res)=>{
  try{
    const { plan='freemium' } = req.body;
    const price = plan === 'enterprise' ? 10000 : plan==='consultation'?5000:0; // in cents
    const session = await stripe.checkout.sessions.create({
      payment_method_types:['card'],
      line_items:[{
        price_data:{
          currency:'usd',
          product_data:{ name:`${plan} plan` },
          unit_amount: price
        },
        quantity:1
      }],
      mode:'payment',
      success_url: (process.env.CLIENT_URL||'http://localhost:5173') + '/payment-success',
      cancel_url: (process.env.CLIENT_URL||'http://localhost:5173') + '/payment-cancel'
    });
    res.json({ id: session.id, url: session.url });
  }catch(e){
    console.error(e);
    res.status(500).json({error:'stripe error'});
  }
});

export default router;
