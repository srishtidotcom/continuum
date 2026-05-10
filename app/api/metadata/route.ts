import { NextRequest, NextResponse } from 'next/server'

interface LinkMetadata {
  url: string
  title?: string
  description?: string
  image?: string
  domain: string
}

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }

    // Extract URLs from text
    const urlRegex = /(https?:\/\/[^\s]+)/g
    const urls = text.match(urlRegex) || []

    if (urls.length === 0) {
      return NextResponse.json({ metadata: [] })
    }

    // Fetch metadata for each URL
    const metadata: LinkMetadata[] = []

    for (const url of urls) {
      try {
        // Fetch the page
        const response = await fetch(url, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          // Don't follow more than 5 redirects to avoid infinite loops
          redirect: 'follow'
        })

        if (!response.ok) continue

        const html = await response.text()

        // Extract metadata using regex (simple but effective for most cases)
        const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i)
        const descriptionMatch = html.match(
          /<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i
        )
        const imageMatch = html.match(
          /<meta\s+property=["']og:image["']\s+content=["']([^"']*)["']/i
        )

        const urlObj = new URL(url)

        metadata.push({
          url,
          title: titleMatch ? titleMatch[1].trim() : undefined,
          description: descriptionMatch ? descriptionMatch[1].trim() : undefined,
          image: imageMatch ? imageMatch[1] : undefined,
          domain: urlObj.hostname || ''
        })
      } catch (err) {
        // Skip URLs that can't be fetched
        const urlObj = new URL(url)
        metadata.push({
          url,
          domain: urlObj.hostname || ''
        })
      }
    }

    return NextResponse.json({ metadata })
  } catch (err) {
    console.error('Error extracting metadata:', err)
    return NextResponse.json(
      { error: 'Failed to extract metadata' },
      { status: 500 }
    )
  }
}
