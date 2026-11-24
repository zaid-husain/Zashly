import { Link } from "react-router";
import {
  ArrowUpRight,
  Github,
  Globe,
  Instagram,
  Linkedin,
  LoaderPinwheel,
} from "lucide-react";
import { SITE_NAME } from "../../config/seo.config";

const footerLinks = {
  "Zashly Links": [
    { label: "Home", to: "/" },
    { label: "Features", to: "/features" },
    { label: "About", to: "/about" },
    { label: "Sign Up", to: "/signup" },
    { label: "Sign In", to: "/login" },
  ],
  Legal: [
    { label: "Privacy Policy", to: "/privacy" },
    { label: "Terms & Conditions", to: "/terms" },
  ],
};

const projectLinks = [
  { label: "Zashio", href: "https://zashio.vercel.app" },
  { label: "Zashub", href: "https://zashub.vercel.app" },
  { label: "ZashQr", href: "https://zashqr.vercel.app" },
];

const socialLinks = [
  {
    label: "Portfolio",
    href: "https://www.zaidhusain.me",
    icon: Globe,
  },
  {
    label: "GitHub",
    href: "https://github.com/zaid-husain",
    icon: Github,
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/zaid-husain/",
    icon: Linkedin,
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/zaidquazi19__/",
    icon: Instagram,
  },
];

const ExternalFooterLink = ({ href, children, icon: Icon }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="group inline-flex items-center gap-2 text-sm opacity-70 transition-all duration-200 hover:translate-x-0.5 hover:opacity-100 hover:text-primary focus:outline-none focus-visible:underline"
  >
    {Icon && <Icon className="size-4 shrink-0" aria-hidden="true" />}
    <span>{children}</span>
  </a>
);

const SiteFooter = () => {
  const year = new Date().getFullYear();

  return (
    <footer
      className="border-t border-base-300 bg-base-200/80 mt-auto"
      role="contentinfo"
      aria-label="Site footer"
    >
      <div className="w-full px-4 sm:px-6 lg:px-12 xl:px-24 py-8 sm:py-10 lg:py-12">
        <div className="grid grid-cols-2 lg:grid-cols-[minmax(240px,1.6fr)_repeat(4,minmax(120px,0.7fr))] gap-x-5 gap-y-8 sm:gap-x-8 sm:gap-y-10">
          <div className="col-span-2 lg:col-span-1 space-y-3">
            <Link
              to="/"
              className="inline-flex items-center gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
              aria-label={`${SITE_NAME} home`}
            >
              <LoaderPinwheel className="size-8 text-primary animate-spin-slow" aria-hidden="true" />
              <span className="text-2xl font-bold font-mono bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
                {SITE_NAME}
              </span>
            </Link>
            <p className="text-sm opacity-70 max-w-md leading-relaxed">
              Secure real-time messaging, voice &amp; video calls, and AI-ready chat — built for
              modern teams and communities who value privacy and speed.
            </p>
          </div>

          {Object.entries(footerLinks).map(([section, links]) => (
            <nav key={section} aria-label={`${section} links`}>
              <h2 className="font-semibold text-sm uppercase tracking-wide mb-4 opacity-80">
                {section}
              </h2>
              <ul className="space-y-2.5">
                {links.map(({ label, to }) => (
                  <li key={to}>
                    <Link
                      to={to}
                      className="text-sm opacity-70 hover:opacity-100 hover:text-primary transition-colors duration-200 focus:outline-none focus-visible:underline"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <nav aria-label="Other projects">
            <h2 className="font-semibold text-sm uppercase tracking-wide mb-4 opacity-80">
              Other Projects
            </h2>
            <ul className="space-y-2.5">
              {projectLinks.map(({ label, href }) => (
                <li key={href}>
                  <ExternalFooterLink href={href}>
                    {label}
                    <ArrowUpRight
                      className="size-3.5 opacity-0 -translate-x-1 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-60"
                      aria-hidden="true"
                    />
                  </ExternalFooterLink>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Social links">
            <h2 className="font-semibold text-sm uppercase tracking-wide mb-4 opacity-80">
              Connect With Me
            </h2>
            <ul className="space-y-2.5">
              {socialLinks.map(({ label, href, icon }) => (
                <li key={href}>
                  <ExternalFooterLink href={href} icon={icon}>
                    {label}
                  </ExternalFooterLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-10 pt-6 border-t border-base-300 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between text-xs opacity-60">
          <p>
            © {year} {SITE_NAME}. All rights reserved.{" "}
            <span className="whitespace-nowrap">
              Developed by{" "}
              <a
                href="https://www.zaidhusain.me"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium transition-colors duration-200 hover:text-primary"
              >
                Zaid Husain
              </a>
            </span>
          </p>
          <p>Secure messaging · Real-time chat · Built for the web</p>
        </div>
      </div>
    </footer>
  );
};

export default SiteFooter;
