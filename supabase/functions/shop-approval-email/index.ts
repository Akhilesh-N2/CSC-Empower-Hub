import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { email, shopName } = await req.json()

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'CSC Empower Hub <onboarding@yourdomain.com>', // Update with your verified Resend domain
        to: email,
        subject: 'Welcome to CSC Empower Hub! Your Account is Approved 🎉',
        html: `
          <div style="font-family: Arial, sans-serif; max-w: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
            <h2 style="color: #0f172a;">Account Approved!</h2>
            <p style="color: #475569; font-size: 16px;">Hello ${shopName},</p>
            <p style="color: #475569; font-size: 16px;">We are thrilled to let you know that your shop account has been officially verified and approved by our admin team.</p>
            
            <div style="background-color: #f8fafc; padding: 15px; border-left: 4px solid #2563eb; margin: 20px 0;">
              <p style="margin: 0; color: #1e293b; font-weight: bold;">Your 1-Year License is Active</p>
              <p style="margin: 5px 0 0 0; color: #64748b; font-size: 14px;">Your subscription starts today and is valid for exactly 12 months. You now have full access to the Shop Dashboard, Poster downloads, and automated branding tools.</p>
            </div>

            <a href="https://yourwebsite.com/login" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 10px;">Log In to Your Dashboard</a>
            
            <p style="color: #94a3b8; font-size: 12px; margin-top: 30px; border-top: 1px solid #e2e8f0; pt-4;">
              If you have any questions, reply directly to this email.<br>
              - The CSC Empower Hub Team
            </p>
          </div>
        `
      })
    })

    const data = await res.json()
    return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 })
  }
})