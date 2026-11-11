import type { DecisionMakerV1 } from "@sponzilla/contracts/v1";

/**
 * Persona priority for sponsorship/partnership outreach, highest first.
 *
 * This is deliberately deterministic and inspectable: the operator can see
 * exactly why a person was ranked where they were. It is not an inference.
 */
export const DEFAULT_PERSONA_TITLES: readonly string[] = [
  "head of partnerships",
  "partnerships director",
  "director of partnerships",
  "vp of partnerships",
  "vp partnerships",
  "sponsorship",
  "chief marketing officer",
  "cmo",
  "vp of marketing",
  "vp marketing",
  "head of marketing",
  "brand director",
  "head of brand",
  "marketing director",
  "director of marketing",
  "founder",
  "ceo",
];

export interface RankedTarget {
  name: string | null;
  title: string | null;
  linkedinUrl: string | null;
  email: string | null;
  sourceUrl: string | null;
  verified: boolean;
  /** 0–100 persona fit. Deterministic, based on the title only. */
  personaScore: number;
  matchedPersona: string | null;
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

export function rankTargets(
  decisionMakers: readonly DecisionMakerV1[],
  options: { personaTitles?: readonly string[] } = {},
): RankedTarget[] {
  const personaTitles = (
    options.personaTitles && options.personaTitles.length > 0
      ? options.personaTitles
      : DEFAULT_PERSONA_TITLES
  )
    .map(normalize)
    .filter(Boolean);

  return decisionMakers
    .map((decisionMaker): RankedTarget => {
      const title = decisionMaker.title ?? null;
      const normalizedTitle = title ? normalize(title) : "";

      let matchedPersona: string | null = null;
      let tierIndex = -1;

      if (normalizedTitle) {
        tierIndex = personaTitles.findIndex((persona) =>
          normalizedTitle.includes(persona),
        );

        if (tierIndex >= 0) {
          matchedPersona = personaTitles[tierIndex] ?? null;
        }
      }

      /*
       * Earlier personas score higher. An unmatched but known title still
       * outranks a person with no title at all, because we at least know
       * who they are.
       */
      const personaScore =
        tierIndex >= 0
          ? Math.max(30, 100 - tierIndex * 8)
          : normalizedTitle
            ? 20
            : 10;

      return {
        name: decisionMaker.name ?? null,
        title,
        linkedinUrl: decisionMaker.linkedinUrl ?? null,
        email: decisionMaker.email ?? null,
        sourceUrl: decisionMaker.sourceUrl ?? null,
        verified: decisionMaker.verified === true,
        personaScore,
        matchedPersona,
      };
    })
    .sort((a, b) => {
      if (b.personaScore !== a.personaScore) {
        return b.personaScore - a.personaScore;
      }

      return (a.name ?? "").localeCompare(b.name ?? "");
    });
}
