/**
 * Everything about the person, in one file. Edit here, not in components.
 */
export const PROFILE = {
  name: "Ross Gibson",
  handle: "gibz",
  location: "Chicago",
  role: "Data engineer",

  /** Used for the page title and the screen-reader heading. */
  tagline: "Data engineer in Chicago",

  bio: [
    "I spent nine years at Kraft Heinz, which is about seven longer than I expected when I started there as a financial analyst in 2016. Back then I was building Excel and VBA models so HR could budget a billion dollars a year. By the time I left I was writing Python pipelines into Snowflake and had just finished a stint helping roll out an AI-driven hiring platform.",
    "The move from finance to data happened slowly. I kept automating pieces of my own job, the automations kept being more interesting than the job itself, and at some point it stopped being a side activity. I went back to school at DePaul for a master's in data science while still working full time. My undergrad is in finance, from Iowa.",
    "Most of my professional work is unglamorous and I've come to like that. Pipelines that run on schedule. dbt models people trust enough to argue with. Dashboards that don't quietly lie to you. Mostly Python, SQL, dbt, Dagster, Snowflake and Azure.",
    "What's on my GitHub is a different thing entirely. Those are nights and weekends: Ethereum indexers in Rust, ESP32 firmware for plant sensors, a tracker that keeps my 3D printer honest about how much filament it has left. Almost none of it is what I was trained to do, which is most of the appeal.",
  ],

  education: [
    {
      school: "DePaul University",
      credential: "M.S. Data Science",
      years: "2020 – 2022",
      where: "Chicago, IL",
    },
    {
      school: "University of Iowa, Tippie College of Business",
      credential: "B.B.A. Finance",
      years: "2012 – 2016",
      where: "Iowa City, IA",
    },
  ],

  /** Grouped roughly as they are used, not as a keyword list. */
  stack: [
    { label: "Daily", items: ["Python", "SQL", "dbt", "Dagster", "Snowflake"] },
    { label: "Cloud", items: ["Azure (ADF, Event Hubs, Blob)", "AWS (EC2, S3)", "Docker", "FastAPI"] },
    { label: "Reporting", items: ["Tableau", "Power BI", "Grafana", "Prometheus"] },
    { label: "After hours", items: ["Rust", "C / ESP-IDF", "TypeScript", "WebGPU"] },
  ],

  links: [
    { label: "GitHub", href: "https://github.com/gibz104", handle: "@gibz104" },
    { label: "LinkedIn", href: "https://www.linkedin.com/in/rosskgibson", handle: "rosskgibson" },
  ],
} as const;

export type ProfileLink = (typeof PROFILE.links)[number];
