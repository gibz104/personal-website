/**
 * Everything about the person, in one file. Edit here, not in components.
 */
export const PROFILE = {
  name: "Ross Gibson",
  handle: "gibz",
  location: "Chicago",

  /** The hero line. Kept short on purpose — the field behind it is the loud part. */
  tagline: "I build systems that turn streams of signal into something legible.",

  /** About page, one paragraph per entry. */
  bio: [
    "I write infrastructure for data that doesn't stop arriving. Most of it has been onchain — indexers that run inside the Ethereum node instead of polling it from outside, and tooling that lets analysts read a chain's database directly rather than through JSON-RPC.",
    "The rest is physical. ESP32 firmware for sensors that report soil moisture and light, over-the-air update machinery for devices I can't reach, and a filament tracker that closes the loop between a 3D printer and the spool inventory it's burning through.",
    "It's the same problem in both cases. Something real is producing a signal faster than anyone can watch it, and the job is to catch it, index it, and render it in a form a person can actually reason about.",
  ],

  /** Shown as a compact list on the About page. */
  stack: [
    { label: "Systems", items: ["Rust", "C++", "Python", "TypeScript"] },
    { label: "Onchain", items: ["Reth", "ExEx", "MDBX", "web3.py", "Cryo"] },
    { label: "Hardware", items: ["ESP32", "Arduino", "MQTT", "Thread", "Home Assistant"] },
    { label: "Web", items: ["Next.js", "React", "WebGPU", "Tailwind"] },
  ],

  links: [
    { label: "GitHub", href: "https://github.com/gibz104", handle: "@gibz104" },
    // TODO: swap in the real LinkedIn URL.
    { label: "LinkedIn", href: "https://www.linkedin.com/in/rossgibson", handle: "Ross Gibson" },
  ],
} as const;

export type ProfileLink = (typeof PROFILE.links)[number];
