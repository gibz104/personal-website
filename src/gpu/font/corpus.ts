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
 * Share of the field each language occupies. This is the one piece of real
 * information encoded in the artwork, and it is about the person, not the
 * portfolio — so it stays true no matter what he ships next.
 */
export const LANGUAGE_WEIGHT: Record<Language, number> = {
  python: 0.42,
  typescript: 0.30,
  rust: 0.17,
  c: 0.11,
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
  // ---- the rosetta motif: one idea, four languages -----------------------
  { lang: "python", rosetta: true, text: 'async for event in stream:' },
  { lang: "python", rosetta: true, text: '    await index.write(event)' },
  { lang: "typescript", rosetta: true, text: 'for await (const event of stream) await index.write(event);' },
  { lang: "rust", rosetta: true, text: 'while let Some(event) = stream.next().await { index.write(event).await?; }' },
  { lang: "c", rosetta: true, text: 'while (stream_next(&s, &ev) == 0) index_write(&ix, &ev);' },

  // ---- identity: whose site this is --------------------------------------
  //
  // A larger share than a monogram strictly needs, because these are the lines
  // that repay looking. They are still a minority of the corpus: often enough
  // to be found within a minute of watching, rare enough that finding one
  // still feels like catching something.
  { lang: "python", identity: true, text: 'AUTHOR = "Ross Gibson"   # rossgibson.dev' },
  { lang: "python", identity: true, text: 'LOCATION, HANDLE = "Chicago, IL", "gibz104"' },
  { lang: "python", identity: true, text: 'WRITES = ("python", "typescript", "rust", "c")' },
  { lang: "python", identity: true, text: 'TZ = ZoneInfo("America/Chicago")' },
  { lang: "python", identity: true, text: 'CHICAGO = (41.8781, -87.6298)   # lat, lon' },
  { lang: "python", identity: true, text: 'def about() -> str: return f"{AUTHOR} - {LOCATION}"' },
  { lang: "typescript", identity: true, text: 'export const site = { domain: "rossgibson.dev", handle: "gibz104" };' },
  { lang: "typescript", identity: true, text: 'export const author = { name: "Ross Gibson", city: "Chicago" } as const;' },
  { lang: "typescript", identity: true, text: 'type Author = { name: "Ross Gibson"; based: "Chicago, IL" };' },
  { lang: "typescript", identity: true, text: 'const tz = "America/Chicago";' },
  { lang: "rust", identity: true, text: 'const AUTHOR: &str = "Ross Gibson";' },
  { lang: "rust", identity: true, text: 'const CITY: &str = "Chicago, IL";' },
  { lang: "rust", identity: true, text: 'impl Site for Ross { fn domain(&self) -> &str { "rossgibson.dev" } }' },
  { lang: "c", identity: true, text: '#define SITE_HOST "rossgibson.dev"' },
  { lang: "c", identity: true, text: 'static const char *AUTHOR = "Ross Gibson";' },
  { lang: "c", identity: true, text: 'static const char *CITY = "Chicago, IL";' },

  // ---- short and complete ------------------------------------------------
  //
  // A narrow screen can only hold short lines, so the corpus needs enough of
  // them to stay varied on a phone. Every one is a whole statement: a line that
  // runs off the edge and gets clipped mid-token reads as broken code.
  { lang: "python", text: 'from dataclasses import dataclass' },
  { lang: "python", text: 'moisture = raw / 4095.0' },
  { lang: "python", text: 'await queue.put(reading)' },
  { lang: "python", text: 'return sorted(rows, key=attrgetter("at"))' },
  { lang: "typescript", text: 'const [rows, setRows] = useState([]);' },
  { lang: "typescript", text: 'export type Grams = number;' },
  { lang: "typescript", text: 'await queue.drain();' },
  { lang: "rust", text: 'let db = Arc::clone(&self.db);' },
  { lang: "rust", text: 'tx.commit()?;' },
  { lang: "rust", text: 'use reth_exex::ExExEvent;' },
  { lang: "c", text: 'esp_wifi_set_ps(WIFI_PS_NONE);' },
  { lang: "c", text: 'vTaskDelay(pdMS_TO_TICKS(250));' },
  { lang: "c", text: 'size_t len = sizeof(buf);' },

  // ---- python (most of the field) ----------------------------------------
  { lang: "python", text: 'async def poll(self, interval: float = 30.0) -> None:' },
  { lang: "python", text: '    async with session.get(url, timeout=10) as response:' },
  { lang: "python", text: '        payload = await response.json()' },
  { lang: "python", text: 'df = pl.read_parquet(path).filter(pl.col("gas") > 21_000)' },
  { lang: "python", text: '@dataclass(frozen=True)' },
  { lang: "python", text: 'class Gateway(mqtt.Client):' },
  { lang: "python", text: '    def on_message(self, client, userdata, message) -> None:' },
  { lang: "python", text: '    return {addr: reading for addr, reading in sensors.items()}' },
  { lang: "python", text: '    logger.info("published %s to %s", payload, topic)' },
  { lang: "python", text: 'with contextlib.suppress(asyncio.CancelledError):' },
  { lang: "python", text: '    yield from (row for row in cursor if row.value is not None)' },
  { lang: "python", text: 'def moving_average(xs: Sequence[float], window: int) -> list[float]:' },
  { lang: "python", text: '    return [sum(xs[i : i + window]) / window for i in range(len(xs) - window)]' },
  { lang: "python", text: 'if __name__ == "__main__":' },
  { lang: "python", text: '    asyncio.run(main())' },
  { lang: "python", text: 'raise ValueError(f"unknown topic: {topic!r}")' },
  { lang: "python", text: '    conn.execute("insert into readings values (?, ?, ?)", row)' },

  // ---- typescript ---------------------------------------------------------
  { lang: "typescript", text: 'export async function sync(client: Client): Promise<Spool[]> {' },
  { lang: "typescript", text: '    const { data, error } = await client.from("spools").select();' },
  { lang: "typescript", text: 'type Reading = { moisture: number; lux: number; at: string };' },
  { lang: "typescript", text: '    if (!res.ok) throw new Error(`HTTP ${res.status}`);' },
  { lang: "typescript", text: '    return rows.map((row) => ({ ...row, grams: row.used * 1000 }));' },
  { lang: "typescript", text: 'const sorted = table.sort((a, b) => b.wins - a.wins || b.diff - a.diff);' },
  { lang: "typescript", text: 'export const revalidate = 300;' },
  { lang: "typescript", text: 'const gpu = await init(); const output = surface(gpu, canvas);' },
  { lang: "typescript", text: 'useEffect(() => engine.dispose, [engine]);' },
  { lang: "typescript", text: 'interface Standings { team: string; wins: number; diff: number }' },
  { lang: "typescript", text: '    frame.pass({ target: scene }, (p) => p.draw(effect));' },

  // ---- rust ---------------------------------------------------------------
  { lang: "rust", text: 'pub async fn index(&self, block: BlockNumber) -> Result<Receipt> {' },
  { lang: "rust", text: '    let mut tx = self.db.begin_rw()?;' },
  { lang: "rust", text: 'impl ExExContext for Indexer {' },
  { lang: "rust", text: '    match notification {' },
  { lang: "rust", text: '        Notification::ChainCommitted { new } => self.apply(new)?,' },
  { lang: "rust", text: '#[derive(Debug, Clone, PartialEq)]' },
  { lang: "rust", text: '    let cursor = tx.cursor_read::<tables::Headers>()?;' },
  { lang: "rust", text: '    tracing::info!(target: "exex", ?block, "committed");' },

  // ---- c ------------------------------------------------------------------
  { lang: "c", text: 'esp_err_t ota_begin(const char *url, size_t len) {' },
  { lang: "c", text: 'static void IRAM_ATTR on_timer(void *arg) {' },
  { lang: "c", text: '    if (esp_ota_set_boot_partition(part) != ESP_OK) return ESP_FAIL;' },
  { lang: "c", text: '    ESP_LOGI(TAG, "rollback armed, booting slot %d", slot);' },
  { lang: "c", text: '    adc_oneshot_read(handle, ADC_CHANNEL_3, &raw);' },
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
