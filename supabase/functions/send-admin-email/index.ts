import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// CORS headers so your React app can talk to it
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { template_id, template_params } = await req.json()

    // 🚨 PASTE YOUR EMAILJS SECRETS HERE 🚨
    const emailJsPayload = {
      service_id: "service_7bfs32k",
      template_id: template_id,
      user_id: "LCf7B01Dm3o5RmXRv", // Your Public Key
      accessToken: "L8qWd-OBF3tqzrXZG9L3b", // <-- PASTE YOUR PRIVATE KEY HERE
      template_params: template_params
    }

    const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(emailJsPayload)
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`EmailJS Error: ${text}`)
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    // ✨ FIX: Safely check if it's an Error object before reading .message
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred"
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})