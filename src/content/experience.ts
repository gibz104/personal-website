/**
 * Work history. Edit here; the Work page renders whatever is in this list.
 */
export type Role = {
  title: string;
  /** Shown right-aligned against the title. */
  period: string;
  /** Two or three lines. Enough to say what the job actually was. */
  points: string[];
};

export type Position = {
  company: string;
  where: string;
  period: string;
  /** Most recent first. */
  roles: Role[];
};

export const EXPERIENCE: Position[] = [
  {
    company: "Kraft Heinz",
    where: "Chicago, IL",
    period: "2016 – 2025",
    roles: [
      {
        title: "Staff Technical Specialist",
        period: "Apr – Sep 2025",
        points: [
          "Led an AI-driven HR transformation, implementing an ATS platform and rebuilding recruitment workflows around it.",
          "Built the guardrails, enablement and training for AI-assisted recruiting, and measured adoption across the HR organisation. Data accuracy improved about 10%.",
        ],
      },
      {
        title: "Senior Data Engineer",
        period: "Nov 2023 – Apr 2025",
        points: [
          "Wrote four custom Python ETL handlers pulling from global ERP systems into Snowflake, covering three business domains.",
          "Refactored the data engineering repository and its Dagster orchestration layer, adding CI/CD and cutting execution time by more than 20% across 15+ scheduled workflows.",
          "Built FastAPI backends and front-end features for an internal data platform, opening governed self-service access to five analytics and business teams.",
        ],
      },
      {
        title: "Data Engineer",
        period: "Oct 2021 – Nov 2023",
        points: [
          "Designed and deployed 10+ Snowflake models in dbt, SQL and Jinja, turning raw enterprise data into the datasets behind five People Analytics and HR dashboards.",
          "Built Python pipelines in Azure Data Factory and Dagster across six enterprise source systems.",
          "Wrote reusable API handlers for Tableau, Workday, Cornerstone, Jira and Azure DevOps, so new sources could be added without starting over each time.",
        ],
      },
      {
        title: "IT Manager — Data Platform & Analytics",
        period: "Oct 2019 – Oct 2021",
        points: [
          "Implemented Workday Adaptive Planning for the global HR community: budgeting, forecast, bonus accrual and executive reporting models used in every region.",
          "Built the data retrieval behind the enterprise COVID-19 vaccination tracking system used by the executive team.",
          "Sat between Finance, HR and Technology, translating planning requirements into governed models.",
        ],
      },
      {
        title: "Finance Manager — Oscar Mayer",
        period: "May – Oct 2019",
        points: [
          "Ran P&L reporting, forecasting and pricing analytics for the $1B Bacon and Hot Dog businesses.",
          "Led pricing and trade optimisation across key retail customers, modelling promo ROI to guide commercial strategy.",
        ],
      },
      {
        title: "Senior Financial Analyst",
        period: "Apr 2017 – May 2019",
        points: [
          "Built a global benchmark model comparing finance organisation structures across every zone and business unit.",
          "Replaced the manual WHQ intercompany invoicing process with a system-based one.",
        ],
      },
      {
        title: "Financial Analyst",
        period: "May 2016 – Apr 2017",
        points: [
          "Built the Excel and VBA models the global HR community used to budget over $1B a year across 20,000+ salaried positions.",
          "Estimated monthly bonus accruals for 10,000+ employees.",
        ],
      },
    ],
  },
];
