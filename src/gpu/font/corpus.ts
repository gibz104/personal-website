/**
 * The code that lives inside the artwork.
 *
 * Deliberately generic: it is flavour, not content. Nothing here is read from
 * the repositories, so adding or removing a project never changes the art.
 * The languages are the ones the site's author actually writes, which is enough
 * to signal "developer" without encoding anything.
 */

/** Token classes drive colour in the shaders. */
export const TOKEN = {
  punctuation: 0,
  rust: 1,
  typescript: 2,
  python: 3,
  cpp: 4,
  keyword: 5,
  string: 6,
  literal: 7,
} as const;

export type TokenClass = (typeof TOKEN)[keyof typeof TOKEN];

/** Matches the language accents used elsewhere on the site. */
export const TOKEN_COLORS: Record<number, readonly [number, number, number]> = {
  [TOKEN.punctuation]: [0.42, 0.48, 0.60],
  [TOKEN.rust]: [1.0, 0.46, 0.18],
  [TOKEN.typescript]: [0.32, 0.72, 1.0],
  [TOKEN.python]: [0.42, 0.92, 0.74],
  [TOKEN.cpp]: [0.78, 0.48, 1.0],
  [TOKEN.keyword]: [0.94, 0.96, 1.0],
  [TOKEN.string]: [1.0, 0.80, 0.42],
  [TOKEN.literal]: [0.55, 0.95, 0.95],
};

const KEYWORDS = new Set([
  "pub", "async", "fn", "let", "mut", "impl", "for", "match", "if", "else",
  "return", "struct", "enum", "trait", "use", "await", "const", "static",
  "export", "function", "type", "interface", "await", "new", "throw", "class",
  "def", "self", "import", "from", "with", "yield", "raise", "try", "except",
  "void", "auto", "template", "typename", "namespace", "nullptr", "size_t",
  "unsafe", "where", "loop", "while", "in", "as", "dyn", "move", "ref",
]);

type Line = { text: string; language: TokenClass };

const LINES: Line[] = [
  { language: TOKEN.rust, text: 'pub async fn index(&self, block: BlockNumber) -> Result<Receipt> {' },
  { language: TOKEN.rust, text: '    let mut tx = self.db.begin_rw()?;' },
  { language: TOKEN.rust, text: '    tracing::info!(target: "exex", ?block, "committed");' },
  { language: TOKEN.rust, text: 'impl ExExContext for Indexer {' },
  { language: TOKEN.rust, text: '    match notification {' },
  { language: TOKEN.rust, text: '        Notification::ChainCommitted { new } => self.apply(new)?,' },
  { language: TOKEN.rust, text: '        Notification::ChainReverted { old } => self.revert(old)?,' },
  { language: TOKEN.rust, text: '    let cursor = tx.cursor_read::<tables::Headers>()?;' },
  { language: TOKEN.rust, text: '#[derive(Debug, Clone, PartialEq)]' },
  { language: TOKEN.rust, text: '    while let Some((number, header)) = cursor.next()? {' },

  { language: TOKEN.typescript, text: 'export async function sync(client: Client): Promise<Spool[]> {' },
  { language: TOKEN.typescript, text: '    const { data, error } = await client.from("spools").select();' },
  { language: TOKEN.typescript, text: 'type Reading = { moisture: number; lux: number; at: string };' },
  { language: TOKEN.typescript, text: '    if (!res.ok) throw new Error(`HTTP ${res.status}`);' },
  { language: TOKEN.typescript, text: 'export const revalidate = 300;' },
  { language: TOKEN.typescript, text: '    return rows.map((row) => ({ ...row, usedGrams: row.used * 1000 }));' },
  { language: TOKEN.typescript, text: 'interface Standings { team: string; wins: number; diff: number }' },
  { language: TOKEN.typescript, text: '    const sorted = table.sort((a, b) => b.wins - a.wins || b.diff - a.diff);' },

  { language: TOKEN.python, text: 'async def poll(self, interval: float = 30.0) -> None:' },
  { language: TOKEN.python, text: '    df = pl.read_parquet(path).filter(pl.col("gas") > 21_000)' },
  { language: TOKEN.python, text: '@dataclass(frozen=True)' },
  { language: TOKEN.python, text: 'class Gateway(mqtt.Client):' },
  { language: TOKEN.python, text: '    async with session.get(url, timeout=10) as response:' },
  { language: TOKEN.python, text: '    return {addr: reading for addr, reading in sensors.items()}' },
  { language: TOKEN.python, text: '    logger.info("published %s to %s", payload, topic)' },

  { language: TOKEN.cpp, text: 'esp_err_t ota_begin(const char *url, size_t len) {' },
  { language: TOKEN.cpp, text: '    static void IRAM_ATTR on_timer(void *arg) {' },
  { language: TOKEN.cpp, text: '    if (esp_ota_set_boot_partition(part) != ESP_OK) {' },
  { language: TOKEN.cpp, text: '    xTaskCreatePinnedToCore(loop, "sensor", 4096, nullptr, 5, &task, 1);' },
  { language: TOKEN.cpp, text: '    ESP_LOGI(TAG, "rollback armed, booting slot %d", slot);' },
  { language: TOKEN.cpp, text: '    adc_oneshot_read(handle, ADC_CHANNEL_3, &raw);' },

  { language: TOKEN.typescript, text: 'const gpu = await init(); const surface = surface(gpu, canvas);' },
  { language: TOKEN.typescript, text: '@compute @workgroup_size(64) fn cs_main(@builtin(global_invocation_id) id: vec3u)' },
  { language: TOKEN.rust, text: '// rust · typescript · python · c++ · wgsl · webgpu' },
];

/** One character with its colour class. */
export type Cell = { char: number; token: number };

/** Cheap, deterministic highlighter — enough to read as syntax at a glance. */
function classify(line: Line): Cell[] {
  const out: Cell[] = [];
  const text = line.text;
  let inString: string | null = null;
  let commentFrom = -1;

  const commentIndex = Math.max(
    text.indexOf("//") >= 0 ? text.indexOf("//") : -1,
    text.indexOf("# ") >= 0 ? text.indexOf("# ") : -1,
  );
  if (commentIndex >= 0) commentFrom = commentIndex;

  let word = "";
  let wordStart = 0;

  const flushWord = (end: number) => {
    if (!word) return;
    const token = KEYWORDS.has(word)
      ? TOKEN.keyword
      : /^[0-9_]+$/.test(word)
        ? TOKEN.literal
        : line.language;
    for (let i = 0; i < word.length; i++) out[wordStart + i] = { char: text.charCodeAt(wordStart + i), token };
    word = "";
    void end;
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
      flushWord(i);
      inString = ch;
      out[i] = { char: code, token: TOKEN.string };
      continue;
    }
    if (/[A-Za-z0-9_]/.test(ch)) {
      if (!word) wordStart = i;
      word += ch;
      out[i] = { char: code, token: line.language };
      continue;
    }
    flushWord(i);
    out[i] = { char: code, token: TOKEN.punctuation };
  }
  flushWord(text.length);

  return out;
}

export const CODE_LINES: Cell[][] = LINES.map(classify);
