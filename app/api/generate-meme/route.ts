import { NextResponse } from 'next/server';
import { MemeConcept } from '@/lib/types';

// Netlify's Next.js runtime supports the standard Node.js route handler
// fine — this is a plain serverless function, no persistent state.
export const dynamic = 'force-dynamic';

const CREATURES = [
  'Hamster', 'Frog', 'Raccoon', 'Corgi', 'Penguin', 'Otter', 'Gecko',
  'Sloth', 'Ferret', 'Capybara', 'Pigeon', 'Narwhal', 'Wombat', 'Alpaca',
];

const THEMES = [
  'Rocket', 'Moon', 'Turbo', 'Galaxy', 'Nitro', 'Cosmic', 'Rogue',
  'Quantum', 'Solar', 'Blaze', 'Shadow', 'Volt', 'Orbit', 'Nova',
];

const VIBES = [
  'chaotic good', 'quietly unhinged', 'degenerate-friendly', 'wholesome',
  'gremlin-energy', 'main-character-syndrome', 'unbothered',
];

const ORIGIN_STORIES = [
  'escaped a lab experiment three timezones ago and has not stopped running since',
  'was minted at 3am by someone who should have gone to bed',
  'found a wallet full of SOL in a dumpster and decided this was destiny',
  'got kicked out of a Discord server for being too based and started its own chain instead',
  'was summoned by a group chat that got a little too creative at 2am',
  'is the community mascot nobody asked for but everybody needed',
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildSymbol(name: string): string {
  const compact = name.replace(/[^a-zA-Z]/g, '').toUpperCase();
  return '$' + compact.slice(0, 6);
}

function generateConcept(): MemeConcept {
  const creature = pick(CREATURES);
  const theme = pick(THEMES);
  const vibe = pick(VIBES);
  const origin = pick(ORIGIN_STORIES);

  const name = `${theme} ${creature}`;
  const symbol = buildSymbol(name);

  const description = `A ${vibe} ${creature.toLowerCase()} chasing ${theme.toLowerCase()} energy across the Solana chain.`;

  const lore = `Nobody knows exactly where ${name} came from. Local legend says it ${origin}. What started as a joke in a group chat turned into a full-blown mission: ${creature} vs. the void, ${theme} vs. gravity. The community isn't here for a roadmap — they're here for the ride.`;

  const twitterBio = `${name} (${symbol}) — ${vibe} ${creature.toLowerCase()} on Solana. Not financial advice. Just vibes. 🚀`;

  const announcement = `🚀 ${name} (${symbol}) has landed on Solana.\n\nNo presale. No promises. Just a ${creature.toLowerCase()} with ${theme.toLowerCase()} ambitions and a community that's built different.\n\nWelcome to the chain, ${name}.`;

  const logoPrompt = `A cartoon ${creature.toLowerCase()} with ${theme.toLowerCase()}-themed accessories, meme-coin mascot style, bold outlines, vibrant colors, simple background, crypto Twitter avatar aesthetic.`;

  return { name, symbol, description, lore, twitterBio, announcement, logoPrompt };
}

export async function POST() {
  try {
    const concept = generateConcept();
    return NextResponse.json(concept);
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to generate meme concept.' },
      { status: 500 }
    );
  }
}
