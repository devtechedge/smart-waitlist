"use client";

import * as React from "react";

/**
 * Lightweight i18n System
 * -----------------------
 * A minimal, dependency-free internationalization system.
 * Supports English (en), Spanish (es), and French (fr).
 *
 * The user's language preference is stored in localStorage and synced
 * to the <html lang> attribute.
 *
 * Usage:
 *   const { t, lang, setLang } = useI18n();
 *   t("hero.title")  // → "Skip the line." (or translated)
 *   setLang("es")
 */

export type Language = "en" | "es" | "fr";

type Dict = Record<string, string>;

// ============================================================================
// Dictionaries
// ============================================================================

const en: Dict = {
  "hero.title": "Skip the line.",
  "hero.subtitle": "Bring your friends.",
  "hero.description": "Get early access to the product launch everyone's talking about. Share your unique referral link, climb the queue, and unlock perks as you rise.",
  "hero.cta": "Join the waitlist",
  "hero.cta.dashboard": "Go to your dashboard",
  "hero.badge": "already on the waitlist",

  "features.instant.title": "Instant signup",
  "features.instant.desc": "Join the waitlist in under 30 seconds.",
  "features.viral.title": "Viral referrals",
  "features.viral.desc": "Every friend who signs up moves you up the queue.",
  "features.climb.title": "Climb the ranks",
  "features.climb.desc": "Top referrers get first access + exclusive perks.",

  "how.title": "How it works",
  "how.step1.title": "Join the waitlist",
  "how.step1.desc": "Sign up in 30 seconds with just your email.",
  "how.step2.title": "Share your link",
  "how.step2.desc": "Grab your unique referral link and share it.",
  "how.step3.title": "Climb the queue",
  "how.step3.desc": "Every friend who signs up moves you up.",

  "cta.final.title": "Ready to skip the line?",
  "cta.final.desc": "Join thousands waiting for early access.",

  "form.fullName": "Full name",
  "form.email": "Email",
  "form.password": "Password",
  "form.refCode": "Referral code (optional)",
  "form.submit": "Join the waitlist",
  "form.signin": "Sign in",
  "form.signup": "Sign up",
};

const es: Dict = {
  "hero.title": "Salta la fila.",
  "hero.subtitle": "Trae a tus amigos.",
  "hero.description": "Obtén acceso anticipado al lanzamiento del producto del que todos hablan. Comparte tu enlace de referencia único, sube en la cola y desbloquea ventajas.",
  "hero.cta": "Unirse a la lista",
  "hero.cta.dashboard": "Ir a tu panel",
  "hero.badge": "ya en la lista de espera",

  "features.instant.title": "Registro instantáneo",
  "features.instant.desc": "Únete a la lista en menos de 30 segundos.",
  "features.viral.title": "Referidos virales",
  "features.viral.desc": "Cada amigo que se registra te sube en la cola.",
  "features.climb.title": "Sube de nivel",
  "features.climb.desc": "Los mejores referidores obtienen acceso + ventajas.",

  "how.title": "Cómo funciona",
  "how.step1.title": "Únete a la lista",
  "how.step1.desc": "Regístrate en 30 segundos con tu email.",
  "how.step2.title": "Comparte tu enlace",
  "how.step2.desc": "Comparte tu enlace de referencia único.",
  "how.step3.title": "Sube en la cola",
  "how.step3.desc": "Cada amigo que se registra te sube.",

  "cta.final.title": "¿Listo para saltar la fila?",
  "cta.final.desc": "Únete a miles esperando acceso anticipado.",

  "form.fullName": "Nombre completo",
  "form.email": "Email",
  "form.password": "Contraseña",
  "form.refCode": "Código de referencia (opcional)",
  "form.submit": "Unirse a la lista",
  "form.signin": "Iniciar sesión",
  "form.signup": "Registrarse",
};

const fr: Dict = {
  "hero.title": "Sautez la file.",
  "hero.subtitle": "Amenez vos amis.",
  "hero.description": "Obtenez un accès anticipé au lancement dont tout le monde parle. Partagez votre lien de parrainage unique, montez dans la file et débloquez des avantages.",
  "hero.cta": "Rejoindre la liste",
  "hero.cta.dashboard": "Aller au tableau de bord",
  "hero.badge": "déjà sur la liste d'attente",

  "features.instant.title": "Inscription instantanée",
  "features.instant.desc": "Rejoignez la liste en moins de 30 secondes.",
  "features.viral.title": "Parrainages viraux",
  "features.viral.desc": "Chaque ami inscrit vous fait monter.",
  "features.climb.title": "Montez au classement",
  "features.climb.desc": "Les meilleurs parrains obtiennent un accès + des avantages.",

  "how.title": "Comment ça marche",
  "how.step1.title": "Rejoignez la liste",
  "how.step1.desc": "Inscrivez-vous en 30 secondes.",
  "how.step2.title": "Partagez votre lien",
  "how.step2.desc": "Partagez votre lien de parrainage unique.",
  "how.step3.title": "Montez dans la file",
  "how.step3.desc": "Chaque ami inscrit vous fait monter.",

  "cta.final.title": "Prêt à sauter la file ?",
  "cta.final.desc": "Rejoignez des milliers en attente d'accès.",

  "form.fullName": "Nom complet",
  "form.email": "Email",
  "form.password": "Mot de passe",
  "form.refCode": "Code de parrainage (optionnel)",
  "form.submit": "Rejoindre la liste",
  "form.signin": "Connexion",
  "form.signup": "Inscription",
};

const dictionaries: Record<Language, Dict> = { en, es, fr };

// ============================================================================
// Context
// ============================================================================

type I18nContextValue = {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string) => string;
};

const I18nContext = React.createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = React.useState<Language>("en");
  const mountedRef = React.useRef(false);

  React.useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    const stored = localStorage.getItem("lang") as Language | null;
    if (stored && ["en", "es", "fr"].includes(stored)) {
      requestAnimationFrame(() => {
        setLangState(stored);
        document.documentElement.lang = stored;
      });
    }
  }, []);

  const setLang = React.useCallback((newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem("lang", newLang);
    document.documentElement.lang = newLang;
  }, []);

  const t = React.useCallback(
    (key: string) => {
      return dictionaries[lang][key] ?? dictionaries.en[key] ?? key;
    },
    [lang],
  );

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = React.useContext(I18nContext);
  if (!ctx) {
    // Fallback if used outside provider — returns English
    return {
      lang: "en" as Language,
      setLang: () => {},
      t: (key: string) => dictionaries.en[key] ?? key,
    };
  }
  return ctx;
}

// ============================================================================
// Language Switcher Component
// ============================================================================

import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const LANGUAGES: Array<{ code: Language; label: string; flag: string }> = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
];

export function LanguageSwitcher({ className }: { className?: string }) {
  const { lang, setLang } = useI18n();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className={cn("size-9", className)} aria-label="Switch language">
          <Globe className="size-4" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LANGUAGES.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => setLang(l.code)}
            className={cn(lang === l.code && "font-semibold")}
          >
            <span className="mr-2">{l.flag}</span>
            {l.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
