import { classNames } from "primereact/utils";

import ar from "flag-icons/flags/4x3/ar.svg";
import at from "flag-icons/flags/4x3/at.svg";
import be from "flag-icons/flags/4x3/be.svg";
import br from "flag-icons/flags/4x3/br.svg";
import ch from "flag-icons/flags/4x3/ch.svg";
import cz from "flag-icons/flags/4x3/cz.svg";
import de from "flag-icons/flags/4x3/de.svg";
import dk from "flag-icons/flags/4x3/dk.svg";
import es from "flag-icons/flags/4x3/es.svg";
import fr from "flag-icons/flags/4x3/fr.svg";
import gbEng from "flag-icons/flags/4x3/gb-eng.svg";
import gbSct from "flag-icons/flags/4x3/gb-sct.svg";
import gbWls from "flag-icons/flags/4x3/gb-wls.svg";
import gr from "flag-icons/flags/4x3/gr.svg";
import hr from "flag-icons/flags/4x3/hr.svg";
import it from "flag-icons/flags/4x3/it.svg";
import mx from "flag-icons/flags/4x3/mx.svg";
import nl from "flag-icons/flags/4x3/nl.svg";
import no from "flag-icons/flags/4x3/no.svg";
import pl from "flag-icons/flags/4x3/pl.svg";
import pt from "flag-icons/flags/4x3/pt.svg";
import rs from "flag-icons/flags/4x3/rs.svg";
import sa from "flag-icons/flags/4x3/sa.svg";
import se from "flag-icons/flags/4x3/se.svg";
import tr from "flag-icons/flags/4x3/tr.svg";
import ua from "flag-icons/flags/4x3/ua.svg";
import us from "flag-icons/flags/4x3/us.svg";

/**
 * Named imports like FluentIcon, so only these flags are bundled (each one
 * is a separate file, loaded when it is first shown). Add a flag here and a
 * name to COUNTRY_CODES to support a new country.
 */
const FLAGS = {
  ar,
  at,
  be,
  br,
  ch,
  cz,
  de,
  dk,
  es,
  fr,
  "gb-eng": gbEng,
  "gb-sct": gbSct,
  "gb-wls": gbWls,
  gr,
  hr,
  it,
  mx,
  nl,
  no,
  pl,
  pt,
  rs,
  sa,
  se,
  tr,
  ua,
  us,
} satisfies Record<string, string>;

export type FlagCode = keyof typeof FLAGS;

const isFlagCode = (code: string): code is FlagCode => code in FLAGS;

/** Country names as they appear in tournament files (English and Ukrainian). */
const COUNTRY_CODES: Record<string, FlagCode> = {
  argentina: "ar",
  аргентина: "ar",
  austria: "at",
  австрія: "at",
  belgium: "be",
  бельгія: "be",
  brazil: "br",
  бразилія: "br",
  switzerland: "ch",
  швейцарія: "ch",
  czechia: "cz",
  "czech republic": "cz",
  чехія: "cz",
  germany: "de",
  німеччина: "de",
  denmark: "dk",
  данія: "dk",
  spain: "es",
  іспанія: "es",
  france: "fr",
  франція: "fr",
  england: "gb-eng",
  англія: "gb-eng",
  scotland: "gb-sct",
  шотландія: "gb-sct",
  wales: "gb-wls",
  уельс: "gb-wls",
  greece: "gr",
  греція: "gr",
  croatia: "hr",
  хорватія: "hr",
  italy: "it",
  італія: "it",
  mexico: "mx",
  мексика: "mx",
  netherlands: "nl",
  holland: "nl",
  нідерланди: "nl",
  norway: "no",
  норвегія: "no",
  poland: "pl",
  польща: "pl",
  portugal: "pt",
  португалія: "pt",
  serbia: "rs",
  сербія: "rs",
  "saudi arabia": "sa",
  "саудівська аравія": "sa",
  sweden: "se",
  швеція: "se",
  turkey: "tr",
  türkiye: "tr",
  turkiye: "tr",
  туреччина: "tr",
  ukraine: "ua",
  україна: "ua",
  usa: "us",
  "united states": "us",
  сша: "us",
};

/**
 * Flag for a club: the country from the tournament file first, then the
 * country of the club's league in the crest catalog.
 */
export const resolveFlag = (
  country: string | undefined,
  catalogCode: string | null | undefined
): FlagCode | null => {
  const byName = country && COUNTRY_CODES[country.trim().toLowerCase()];
  if (byName) return byName;
  return catalogCode && isFlagCode(catalogCode) ? catalogCode : null;
};

/** Image file of a flag, for backgrounds. */
export const flagUrl = (code: FlagCode): string => FLAGS[code];

interface ICountryFlagProps {
  code: FlagCode;
  title?: string;
  className?: string;
}

const CountryFlag = ({ code, title, className }: ICountryFlagProps) => (
  <img
    src={FLAGS[code]}
    alt={title ?? code}
    title={title}
    loading="lazy"
    className={classNames("country-flag", className)}
  />
);

export default CountryFlag;
