/**
 * The code that lives inside the artwork.
 *
 * Three rules shape it:
 *
 *  1. Nothing is read from the repositories. Adding or removing a project must
 *     never change the art.
 *  2. The language mix is the author's actual fluency, and the weights below
 *     decide how much of the screen each one occupies. Python dominates because
 *     he writes it by heart; C is a thin seam because it is mostly assisted.
 *  3. A handful of lines quietly say whose site this is. They are rare enough
 *     to be a find rather than a billboard.
 */

export const TOKEN = {
  punctuation: 0,
  python: 1,
  typescript: 2,
  rust: 3,
  c: 4,
  keyword: 5,
  string: 6,
  literal: 7,
} as const;

export type TokenClass = (typeof TOKEN)[keyof typeof TOKEN];

export type Language = "python" | "typescript" | "rust" | "c";

/**
 * Share of the field each language occupies.
 *
 * This is the one piece of real information encoded in the artwork, and it is
 * about the person rather than the portfolio, so it stays true no matter what
 * he ships next.
 *
 * It is not a dial. Lines are drawn from the corpus uniformly, so the realised
 * share is simply how many characters of each language the corpus holds —
 * currently Python 40%, TypeScript 29%, Rust 17%, C 14%. `npm run verify:lines`
 * prints the measured split; move it by adding or removing lines, not by
 * editing this table.
 */
export const LANGUAGE_TARGET: Record<Language, number> = {
  python: 0.40,
  typescript: 0.29,
  rust: 0.17,
  c: 0.14,
};

export const LANGUAGE_TOKEN: Record<Language, TokenClass> = {
  python: TOKEN.python,
  typescript: TOKEN.typescript,
  rust: TOKEN.rust,
  c: TOKEN.c,
};

const KEYWORDS = new Set([
  // python
  "def", "async", "await", "class", "self", "import", "from", "return", "with",
  "for", "in", "if", "else", "elif", "try", "except", "finally", "yield",
  "lambda", "raise", "while", "not", "and", "or", "None", "True", "False",
  // typescript
  "export", "const", "let", "function", "type", "interface", "new", "throw",
  "extends", "implements", "readonly", "satisfies", "as", "of", "void",
  // rust
  "pub", "fn", "impl", "trait", "struct", "enum", "match", "mut", "use", "mod",
  "where", "loop", "unsafe", "dyn", "move", "ref", "Some", "Ok", "Err",
  // c
  "static", "sizeof", "typedef", "struct", "const", "unsigned", "int", "char",
  "size_t", "NULL", "goto", "switch", "case", "break", "continue",
]);

type Line = {
  text: string;
  lang: Language;
  /** Rare lines that name the author. */
  identity?: boolean;
  /** The same operation, written four ways. */
  rosetta?: boolean;
};

const LINES: Line[] = [
  // Every line is a statement that could stand on its own.
  //
  // No block openers, no indented continuations, no dangling braces. A line
  // reading `if x:` or `match notification {` is the start of something the
  // reader never gets to see, and half a construct looks like half a thought.
  // Function signatures are the one exception — they are a whole idea — and
  // they are written without the trailing colon or brace that would promise a
  // body.

  // ---- the rosetta motif: one idea, four languages -----------------------
  { lang: "python", rosetta: true, text: 'for event in stream: index.write(event)' },
  { lang: "typescript", rosetta: true, text: 'for await (const event of stream) await index.write(event);' },
  { lang: "rust", rosetta: true, text: 'while let Some(event) = stream.next().await { index.write(event).await?; }' },
  { lang: "c", rosetta: true, text: 'while (stream_next(&s, &ev) == 0) index_write(&ix, &ev);' },

  // ---- identity: whose site this is --------------------------------------
  { lang: "python", identity: true, text: 'AUTHOR = "Ross Gibson"   # rossgibson.dev' },
  { lang: "python", identity: true, text: 'LOCATION, HANDLE = "Chicago, IL", "gibz104"' },
  { lang: "python", identity: true, text: 'WRITES = ("python", "typescript", "rust", "c")' },
  { lang: "python", identity: true, text: 'TZ = ZoneInfo("America/Chicago")' },
  { lang: "python", identity: true, text: 'CHICAGO = (41.8781, -87.6298)   # lat, lon' },
  { lang: "python", identity: true, text: 'SITE = "rossgibson.dev"' },
  { lang: "typescript", identity: true, text: 'export const site = { domain: "rossgibson.dev", handle: "gibz104" };' },
  { lang: "typescript", identity: true, text: 'export const author = { name: "Ross Gibson", city: "Chicago" } as const;' },
  { lang: "typescript", identity: true, text: 'const tz = "America/Chicago";' },
  { lang: "rust", identity: true, text: 'const AUTHOR: &str = "Ross Gibson";' },
  { lang: "rust", identity: true, text: 'const CITY: &str = "Chicago, IL";' },
  { lang: "c", identity: true, text: '#define SITE_HOST "rossgibson.dev"' },
  { lang: "c", identity: true, text: 'static const char *AUTHOR = "Ross Gibson";' },
  { lang: "c", identity: true, text: 'static const char *CITY = "Chicago, IL";' },

  // ---- python ------------------------------------------------------------
  { lang: "python", text: 'import polars as pl' },
  { lang: "python", text: 'from dataclasses import dataclass' },
  { lang: "python", text: 'moisture = raw / 4095.0' },
  { lang: "python", text: 'window = timedelta(minutes=15)' },
  { lang: "python", text: 'await queue.put(reading)' },
  { lang: "python", text: 'asyncio.run(main())' },
  { lang: "python", text: 'payload = await response.json()' },
  { lang: "python", text: 'await index.write(event)' },
  { lang: "python", text: 'df = pl.read_parquet(path).filter(pl.col("gas") > 21_000)' },
  { lang: "python", text: 'readings = [r for r in rows if r.moisture > 0.35]' },
  { lang: "python", text: 'logger.info("published %s to %s", payload, topic)' },
  { lang: "python", text: 'client.publish(topic, json.dumps(payload), qos=1)' },
  { lang: "python", text: 'conn.execute("insert into readings values (?, ?, ?)", row)' },
  { lang: "python", text: 'sensors = {addr: Reading.parse(buf) for addr, buf in frames.items()}' },
  { lang: "python", text: 'raise ValueError(f"unknown topic: {topic!r}")' },
  { lang: "python", text: 'return sorted(rows, key=attrgetter("at"))' },
  { lang: "python", text: 'gateway = Gateway(host, port, keepalive=60)' },
  { lang: "python", text: 'lux = round(sensor.read_lux(), 2)' },
  { lang: "python", text: 'async def poll(self, interval: float = 30.0) -> None' },
  { lang: "python", text: 'def moving_average(xs: Sequence[float], window: int) -> list[float]' },
  { lang: "python", text: 'def parse(cls, buf: bytes) -> "Reading"' },

  // ---- typescript --------------------------------------------------------
  { lang: "typescript", text: 'export const revalidate = 300;' },
  { lang: "typescript", text: 'export type Grams = number;' },
  { lang: "typescript", text: 'type Reading = { moisture: number; lux: number; at: string };' },
  { lang: "typescript", text: 'const [rows, setRows] = useState([]);' },
  { lang: "typescript", text: 'await queue.drain();' },
  { lang: "typescript", text: 'const { data, error } = await client.from("spools").select();' },
  { lang: "typescript", text: 'const sorted = table.sort((a, b) => b.wins - a.wins || b.diff - a.diff);' },
  { lang: "typescript", text: 'const gpu = await init(); const output = surface(gpu, canvas);' },
  { lang: "typescript", text: 'frame.pass({ target: scene }, (p) => p.draw(effect));' },
  { lang: "typescript", text: 'useEffect(() => engine.dispose, [engine]);' },
  { lang: "typescript", text: 'const grams = rows.reduce((sum, r) => sum + r.used, 0) * 1000;' },
  { lang: "typescript", text: 'export async function sync(client: Client): Promise<Spool[]>' },

  // ---- rust --------------------------------------------------------------
  { lang: "rust", text: 'use reth_exex::ExExEvent;' },
  { lang: "rust", text: 'tx.commit()?;' },
  { lang: "rust", text: 'let db = Arc::clone(&self.db);' },
  { lang: "rust", text: 'let mut tx = self.db.begin_rw()?;' },
  { lang: "rust", text: 'let cursor = tx.cursor_read::<tables::Headers>()?;' },
  { lang: "rust", text: 'tracing::info!(target: "exex", ?block, "committed");' },
  { lang: "rust", text: 'self.notifications.send(ExExEvent::FinishedHeight(tip))?;' },
  { lang: "rust", text: 'pub async fn index(&self, block: BlockNumber) -> Result<Receipt>' },

  // ---- c -----------------------------------------------------------------
  { lang: "c", text: 'size_t len = sizeof(buf);' },
  { lang: "c", text: 'esp_wifi_set_ps(WIFI_PS_NONE);' },
  { lang: "c", text: 'vTaskDelay(pdMS_TO_TICKS(250));' },
  { lang: "c", text: 'adc_oneshot_read(handle, ADC_CHANNEL_3, &raw);' },
  { lang: "c", text: 'ESP_LOGI(TAG, "rollback armed, booting slot %d", slot);' },
  { lang: "c", text: 'esp_err_t ota_begin(const char *url, size_t len)' },
];

export type Cell = { char: number; token: number };

/** Cheap, deterministic highlighter — enough to read as syntax at a glance. */
function classify(line: Line): Cell[] {
  const out: Cell[] = [];
  const text = line.text;
  const base = LANGUAGE_TOKEN[line.lang];

  let inString: string | null = null;
  const hash = text.indexOf("# ");
  const slashes = text.indexOf("//");
  const commentFrom = hash >= 0 ? hash : slashes;

  let word = "";
  let wordStart = 0;

  const flushWord = () => {
    if (!word) return;
    const token = KEYWORDS.has(word)
      ? TOKEN.keyword
      : /^[0-9_]+$/.test(word)
        ? TOKEN.literal
        : base;
    for (let i = 0; i < word.length; i++) {
      out[wordStart + i] = { char: text.charCodeAt(wordStart + i), token };
    }
    word = "";
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    const code = text.charCodeAt(i);

    if (commentFrom >= 0 && i >= commentFrom) {
      out[i] = { char: code, token: TOKEN.punctuation };
      continue;
    }
    if (inString) {
      out[i] = { char: code, token: TOKEN.string };
      if (ch === inString) inString = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      flushWord();
      inString = ch;
      out[i] = { char: code, token: TOKEN.string };
      continue;
    }
    if (/[A-Za-z0-9_]/.test(ch)) {
      if (!word) wordStart = i;
      word += ch;
      out[i] = { char: code, token: base };
      continue;
    }
    flushWord();
    out[i] = { char: code, token: TOKEN.punctuation };
  }
  flushWord();
  return out;
}

export type CorpusLine = {
  cells: Cell[];
  lang: Language;
  identity: boolean;
  rosetta: boolean;
};

export const CODE_LINES: CorpusLine[] = LINES.map((line) => ({
  cells: classify(line),
  lang: line.lang,
  identity: line.identity ?? false,
  rosetta: line.rosetta ?? false,
}));

export const LINES_BY_LANGUAGE: Record<Language, CorpusLine[]> = {
  python: CODE_LINES.filter((l) => l.lang === "python"),
  typescript: CODE_LINES.filter((l) => l.lang === "typescript"),
  rust: CODE_LINES.filter((l) => l.lang === "rust"),
  c: CODE_LINES.filter((l) => l.lang === "c"),
};
