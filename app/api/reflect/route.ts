// Claude API call for nightly reflection
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(req: Request) {
    const { tasks, timeLog, recentPattern } = await req.json()

    const stream = await client.messages.stream({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 200,
        messages: [{
            role: 'user',
            content: `You are a calm, non-judgmental productivity coach.
      
Today's tasks: ${JSON.stringify(tasks)}
Time breakdown: ${JSON.stringify(timeLog)}
Pattern from last 7 days: ${recentPattern}

Ask ONE short, honest question that would help this person reflect on today.
No advice. No praise. Just one question under 40 words.`
        }]
    })

    const message = await stream.finalMessage()
return NextResponse.json({reflection:message.content[0].type})
}

