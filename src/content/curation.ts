/**
 * Editorial layer over the raw GitHub data.
 *
 * `sync-github.ts` reads this, so changing it and re-running `npm run sync`
 * is how you re-curate the portfolio without touching any component.
 *
 * Only PUBLIC repositories are synced. Private repos (libertas, sproutlink-app,
 * data-bodega, cryoviz, ...) are deliberately absent; make one public and it
 * will appear on the next sync.
 */
export type Category = "onchain" | "hardware" | "viz" | "tools";

type Override = {
  title?: string;
  /** One line. Replaces the GitHub description in listings. */
  tagline?: string;
  /** A paragraph shown on the project page, in your voice rather than the README's. */
  blurb?: string;
  category?: Category;
};

export const CURATION = {
  /** Ordered. These become the bright, named attractors in the field. */
  featured: [
    "Rethix",
    "SpoolmanSync",
    "reth-db-py",
    "esea-standings",
    "SafeGithubOTA",
    "ha-sproutlink",
    "xlsb-converter",
    "eth-historical-transactions",
  ],

  /** Forks, duplicates, and scratch repos that would only add noise. */
  hidden: [
    "default",
    "reth",
    "zksync2-python",
    "spoolman-updater",
    "logs-fullcolor",
    "autumn-2021-2022",
    "exex-indexer-priv",
    "zk-farmer",
    "zk-farmer-py",
    "wip-webapp-charts",
    "dagster-local",
    "ai-acd-recaps",
    "reth-web3-middleware",
    "FacetAnalytics",
    "Neon",
  ],

  overrides: {
    Rethix: {
      tagline:
        "An Ethereum indexer that rides inside the node itself, using Reth Execution Extensions.",
      blurb:
        "Most indexers watch a node from the outside and pay for it in latency and RPC pressure. Rethix runs as a Reth ExEx — in-process with execution — so it sees state transitions as they commit rather than polling for them afterwards.",
      category: "onchain",
    },
    "reth-db-py": {
      tagline: "Read Reth's database straight from Python. Written in Rust.",
      blurb:
        "A PyO3 bridge over Reth's MDBX store. The point is to skip JSON-RPC entirely: analysts get a Python API, and the Rust layer keeps the reads cheap enough to run over whole ranges of history.",
      category: "onchain",
    },
    SpoolmanSync: {
      tagline:
        "Filament that tracks itself — Bambu Lab printers to Spoolman, through Home Assistant.",
      blurb:
        "Bambu printers know which spool is loaded and how much they burned; Spoolman knows what you own. Nothing connected the two. SpoolmanSync closes that loop automatically — QR assignment, live usage, and no YAML to hand-write.",
      category: "hardware",
    },
    "esea-standings": {
      title: "ESEA Standings",
      tagline:
        "Live ESEA Counter-Strike standings that show their own work — every tiebreaker, in order.",
      blurb:
        "League tables tell you the ranking but never why. This one derives placement from match data and shows the tiebreaker chain that produced it, so a contested position is auditable instead of asserted.",
      category: "viz",
    },
    "sproutlink-app": {
      title: "Sproutlink",
      tagline:
        "An end-to-end plant telemetry stack: ESP32-C3 sensors, Thread/MQTT transport, Home Assistant, and a web dashboard.",
      blurb:
        "Four repositories that only make sense together — custom ESP32-C3 firmware, a Home Assistant integration, a gateway, and the dashboard. Soil moisture, temperature, humidity and light leave the plant and arrive somewhere legible, with OTA updates handled by SafeGithubOTA.",
      category: "hardware",
    },
    SafeGithubOTA: {
      tagline:
        "Over-the-air firmware updates for ESP32, pulled from private GitHub releases, with rollback that actually works.",
      blurb:
        "Shipping firmware to devices you can't physically reach means a bad flash is a brick. This library does semver-aware updates from private release assets, provisions over a captive portal, and rolls back on its own if the new image fails to come up — with no external dependencies.",
      category: "hardware",
    },
    libertas: {
      tagline: "The backend of an earlier personal visualization site.",
      blurb:
        "The ancestor of this site: a Python service that collected and served the datasets behind libertas.systems. Worth keeping around as the first version of an idea I keep rebuilding — take a live stream of something, and make it readable.",
      category: "viz",
    },
    "data-bodega": {
      title: "Data Bodega",
      tagline: "Download crypto datasets from the browser — Cryo, compiled to the web.",
      category: "onchain",
    },
    "xlsb-converter": {
      title: "XLSB Converter",
      tagline:
        "Bulk-converts every Excel file in a directory to xlsb. Quietly the most-used thing I've written.",
      category: "tools",
    },
    "eth-historical-transactions": {
      title: "Historical Transactions",
      tagline:
        "Pulls every transaction from mined Ethereum blocks into SQLite, via a Geth node.",
      blurb:
        "The earliest version of the indexing idea, and the one that made the case for everything after it: walk the chain, flatten it, and put it somewhere you can query without asking a node for permission.",
      category: "onchain",
    },
    "NFT-Auto-Minter": { title: "NFT Auto-Minter", category: "onchain" },
    web3de_py: { title: "web3de", category: "onchain" },
    web3de_rs: { category: "onchain" },
    "Tableau-DeFi-Infographic": { title: "DeFi Infographic", category: "viz" },
    cryoviz: { title: "CryoViz", category: "viz" },
    "tableau-datasource-refresher": { title: "Tableau Refresher", category: "viz" },
    "google-sheets-writer": { title: "Sheets Writer", category: "tools" },
    "twitch-irc-chat-stream": { title: "Twitch Chat Stream", category: "tools" },
    "covid-vaccination-scraper": { title: "Vaccination Scraper", category: "tools" },
    "alphamev-submission": {
      title: "AlphaMEV",
      tagline:
        "Competition entry for the first alphamev MEV prediction contest — AUC 0.981.",
      category: "onchain",
    },
    "ha-sproutlink": {
      title: "Sproutlink",
      tagline:
        "Home Assistant integration for a plant-telemetry stack — ESP32-C3 sensors over Thread and MQTT.",
      blurb:
        "The public half of a four-part system: custom ESP32-C3 firmware, a gateway, this Home Assistant integration, and a dashboard. Soil moisture, temperature, humidity and light leave the plant and arrive somewhere legible, with OTA updates handled by SafeGithubOTA.",
      category: "hardware",
    },
    "sproutlink-firmware": { category: "hardware" },
    "plant-monitor-firmware": { category: "hardware" },
  } satisfies Record<string, Override>,
} as const satisfies {
  featured: readonly string[];
  hidden: readonly string[];
  overrides: Record<string, Override>;
};
