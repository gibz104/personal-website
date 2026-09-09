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

/** A destination for a project other than its own source. */
export type ProjectLink = {
  /** What is on the other end — a registry, a directory, or the running thing. */
  label: string;
  href: string;
};

type Override = {
  title?: string;
  /** One line. Replaces the GitHub description in listings. */
  tagline?: string;
  /** A paragraph shown on the project page, in your voice rather than the README's. */
  blurb?: string;
  category?: Category;
  /**
   * Where else this project lives: a package registry, a library directory, the
   * deployed site. The repository is added automatically and does not belong
   * here.
   */
  links?: readonly ProjectLink[];
};

/**
 * A project with no public repository — a running service, or a codebase that
 * stays private. GitHub cannot supply these, so they are written out in full.
 */
export type ManualProject = {
  /** Its id in `featured`. Doubles as the React key and the row anchor. */
  name: string;
  title: string;
  tagline: string;
  blurb?: string;
  category: Category;
  /**
   * What the codebase is written in, read off the private repository. GitHub
   * reports this for public projects; for these it has to be stated.
   */
  language: string | null;
  /**
   * Where the title points. These have no public repository, so the running
   * thing is the source link.
   */
  url: string;
  links?: readonly ProjectLink[];
};

export const CURATION = {
  /**
   * Ordered. These become the bright, named attractors in the field.
   *
   * Names are repository names, or the `name` of a `manual` entry for the
   * projects GitHub has never heard of. This list is the running order on the
   * Projects page — `src/lib/projects.ts` reads it directly, so re-ordering
   * here re-orders the page without a re-sync.
   */
  featured: [
    "SpoolmanSync",
    "reth-db-py",
    "sproutlink",
    "SafeGithubOTA",
    "Rethix",
    "weiwizard",
    "libertas-node",
    "esea-standings",
    "xlsb-converter",
  ],

  /**
   * Projects that are not repositories. Same shape as far as the page cares.
   *
   * Each of these carries a "Website" link pointing where its title already
   * points. That repeat is deliberate: with no Source chip there is nothing to
   * tell a reader the title is a link at all, so the row would otherwise offer
   * no visible way to reach the one thing it is about.
   */
  manual: [
    {
      name: "sproutlink",
      title: "Sproutlink",
      tagline:
        "Soil sensors I wired and soldered myself, running firmware I wrote in C, reporting into a web app I built in TypeScript.",
      blurb:
        "Battery powered ESP32-C6 boards sit in the pots and wake on a schedule to read soil moisture, temperature, humidity and light, then send a packet over a Thread mesh to a gateway that forwards it on. The web app is where it turns into something usable: live readings, history, alerts when a plant is drying out, and a read-only link for whoever is watching the place while you are away.",
      category: "hardware",
      language: "C",
      url: "https://sproutlink.io",
      links: [
        { label: "Website", href: "https://sproutlink.io" },
        {
          label: "Home Assistant integration",
          href: "https://github.com/gibz104/ha-sproutlink",
        },
      ],
    },
    {
      name: "weiwizard",
      title: "Weiwizard",
      tagline:
        "A chat wrapper with access to the Ethereum standards through retrieval-augmented generation.",
      blurb:
        "EIPs, ERCs and All Core Devs discussion are scraped from the Ethereum Magicians forum, embedded, and kept in a vector database. Questions are answered against that index rather than from the model's own memory, so a reply quotes the current text of a standard instead of the version it happened to be trained on.",
      category: "tools",
      language: "TypeScript",
      url: "https://weiwizard.libertas.systems",
      links: [{ label: "Website", href: "https://weiwizard.libertas.systems" }],
    },
    {
      name: "libertas-node",
      title: "Libertas Node",
      tagline:
        "A self-hosted Ethereum node that publishes its own telemetry. Dashboards and logs are open to anyone.",
      blurb:
        "Running a node is easy to claim and hard to show. This one keeps its Grafana dashboards and its log stream publicly readable, and contributes what it sees to ethPandaOps' Xatu dataset, so the claim is checkable rather than asserted.",
      category: "tools",
      language: "JavaScript",
      url: "https://node.libertas.systems",
      links: [
        { label: "Website", href: "https://node.libertas.systems" },
        {
          label: "ethPandaOps Lab",
          href: "https://lab.ethpandaops.io/xatu/contributors/clappingconcur38",
        },
      ],
    },
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
        "Most indexers watch a node from the outside and pay for it in latency and RPC pressure. Rethix runs as a Reth ExEx, in-process with execution, so it sees state transitions as they commit rather than polling for them afterwards.",
      category: "onchain",
    },
    "reth-db-py": {
      tagline: "Read Reth's database straight from Python. Written in Rust.",
      blurb:
        "A PyO3 bridge over Reth's MDBX store. The point is to skip JSON-RPC entirely: analysts get a Python API, and the Rust layer keeps the reads cheap enough to run over whole ranges of history.",
      category: "onchain",
      links: [{ label: "PyPI", href: "https://pypi.org/project/reth-db-py/" }],
    },
    SpoolmanSync: {
      tagline:
        "Filament that tracks itself. Bambu Lab and Creality printers to Spoolman, through Home Assistant.",
      blurb:
        "Your printer knows which spool is loaded and how much it burned; Spoolman knows what you own. Nothing connected the two. SpoolmanSync closes that loop automatically for Bambu Lab and Creality alike, both brands on one dashboard: QR assignment, live usage, and no YAML to hand-write.",
      category: "hardware",
      links: [
        {
          label: "Home Assistant community",
          href: "https://community.home-assistant.io/t/spoolmansync-automatic-filament-tracking-for-bambu-lab-printers-beginner-friendly",
        },
        { label: "Docker Hub", href: "https://hub.docker.com/r/gibz104/spoolmansync" },
        {
          label: "Unraid",
          href: "https://ca.unraid.net/apps/spoolmansync-0sev6wr1anq5mn",
        },
      ],
    },
    "esea-standings": {
      title: "ESEA Standings",
      tagline:
        "ESEA Counter-Strike standings, with the tiebreaker detail and live match statistics behind them.",
      blurb:
        "Standings derived from match data rather than copied from a table, with the tiebreakers that decided each placement and the live statistics from the matches that produced them.",
      category: "viz",
      links: [{ label: "Website", href: "https://esea.libertas.systems" }],
    },
    "sproutlink-app": {
      title: "Sproutlink",
      tagline:
        "An end-to-end plant telemetry stack: ESP32-C3 sensors, Thread/MQTT transport, Home Assistant, and a web dashboard.",
      blurb:
        "Four repositories that only make sense together: custom ESP32-C3 firmware, a Home Assistant integration, a gateway, and the dashboard. Soil moisture, temperature, humidity and light leave the plant and arrive somewhere legible, with OTA updates handled by SafeGithubOTA.",
      category: "hardware",
    },
    SafeGithubOTA: {
      tagline:
        "Over-the-air firmware updates for ESP32, pulled from private GitHub releases, with rollback that actually works.",
      blurb:
        "Shipping firmware to devices you can't physically reach means a bad flash is a brick. This library does semver-aware updates from private release assets, provisions over a captive portal, and rolls back on its own if the new image fails to come up, with no external dependencies.",
      category: "hardware",
      links: [
        {
          label: "Arduino Libraries",
          href: "https://www.arduinolibraries.info/libraries/safe-github-ota",
        },
      ],
    },
    libertas: {
      tagline: "The backend of an earlier personal visualization site.",
      blurb:
        "The ancestor of this site: a Python service that collected and served the datasets behind libertas.systems. Worth keeping around as the first version of an idea I keep rebuilding: take a live stream of something and make it readable.",
      category: "viz",
    },
    "data-bodega": {
      title: "Data Bodega",
      tagline: "Download crypto datasets from the browser. Cryo, compiled to the web.",
      category: "onchain",
    },
    "xlsb-converter": {
      title: "XLSB Converter",
      tagline:
        "Bulk-converts every Excel file in a directory to xlsb. Good for speeding up slow workbooks.",
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
        "Competition entry for the first alphamev MEV prediction contest. AUC 0.981.",
      category: "onchain",
    },
    "ha-sproutlink": {
      title: "Sproutlink",
      tagline:
        "Home Assistant integration for a plant-telemetry stack: ESP32-C3 sensors over Thread and MQTT.",
      blurb:
        "The public half of a four-part system: custom ESP32-C3 firmware, a gateway, this Home Assistant integration, and a dashboard. Soil moisture, temperature, humidity and light leave the plant and arrive somewhere legible, with OTA updates handled by SafeGithubOTA.",
      category: "hardware",
      links: [{ label: "sproutlink.io", href: "https://sproutlink.io" }],
    },
    "sproutlink-firmware": { category: "hardware" },
    "plant-monitor-firmware": { category: "hardware" },
  } satisfies Record<string, Override>,
} as const satisfies {
  featured: readonly string[];
  manual: readonly ManualProject[];
  hidden: readonly string[];
  overrides: Record<string, Override>;
};
