"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type PointerEvent, type ReactNode, type ComponentType } from "react";
import { eventsEditorPartLabels, visibleEventsBreadcrumbFields } from "../../lib/eventsEditorParts";
import { createPortal } from "react-dom";
import {
  Award,
  BadgeCheck,
  Building2,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  FileText,
  GripVertical,
  Handshake,
  Heart,
  Home,
  ImageIcon,
  Key,
  LayoutTemplate,
  Link2,
  MapPin,
  Menu,
  Move,
  PanelTop,
  Phone,
  Plus,
  Scale,
  Settings2,
  Shield,
  Sparkles,
  Star,
  Trash,
  Upload,
  Users,
  Video,
  X,
} from "lucide-react";
import { agrandirBolt, generalSansMedium } from "@/app/fonts";
import {
  BannerSlideData,
  ButtonData,
  FormFieldData,
  SectionData,
  SocialLinkData,
  resolveBannerSlideButtons,
} from "../../types/section";
import { sectionRegistry } from "../../lib/sectionRegistry";
import {
  getContentBundle,
  getSectionLayoutsForCategory,
  resolveLayoutPreview,
  resolveThemePortfolioNavLink,
  TOPBAR_LAYOUT_SKINS,
  withTopbarLayoutSkin,
} from "../../data/templateFlow";
import { PageLink, usePreview } from "../context/PreviewContext";
import ImageLibraryPicker from "./ImageLibraryPicker";
import {
  getSectionAnchorId,
} from "../../lib/sectionAnchors";
import {
  DEFAULT_CALL_LINK,
  DEFAULT_WHATSAPP_LINK,
  getFloatingItemIconOptions,
  getFloatingItems,
  syncLegacyFloatingLinks,
  type FloatingItemData,
  type FloatingItemIcon,
  type FloatingItemSide,
} from "../../lib/floatingItems";
import {
  SOCIAL_PLATFORM_OPTIONS,
} from "../../lib/socialPlatforms";
import {
  readOnboardingNavSnapshot,
  saveOnboardingNavSnapshot,
} from "@/lib/onboardingNavSnapshot";
import {
  DEFAULT_ACTIVE_MENU_LINE_GAP,
  DEFAULT_ACTIVE_MENU_PADDING,
  HEADER_ACTIVE_MENU_STYLE_OPTIONS,
  type HeaderActiveMenuStyle,
} from "../sections/header/activeMenuStyles";

type MenuItem = {
  label: string;
  href: string;
  children?: MenuItem[];
  menuType?: "link" | "dropdown" | "mega";
};

type NavHrefPickerKind = "pages" | "sections" | "blogs" | "custom";
type HrefPickerTarget =
  | { source: "nav"; menuIndex: number; childIndex?: number }
  | { source: "footer"; columnIndex: number; linkIndex: number }
  | { source: "generic"; path: GenericFieldPath }
  | { source: "header-button"; index: number }
  | { source: "events-header-button" }
  | { source: "banner-button"; index: number }
  | { source: "banner-slide-button"; slideIndex: number; buttonIndex: number };

const NAV_HREF_PICKER_TABS: Array<{ id: NavHrefPickerKind; label: string }> = [
  { id: "pages", label: "Pages" },
  { id: "sections", label: "Sections" },
  { id: "blogs", label: "Blogs" },
  { id: "custom", label: "Custom" },
];

const detectNavHrefPickerKind = (href: string): NavHrefPickerKind => {
  const normalized = href.trim().toLowerCase();
  if (
    normalized === "#page-blogs" ||
    normalized.startsWith("#page-blog-")
  ) {
    return "blogs";
  }
  if (normalized.startsWith("#page-")) {
    return "pages";
  }
  if (!normalized || normalized.startsWith("#")) {
    return "sections";
  }
  return "custom";
};

const formatNavSectionLabel = (sectionType: string) => {
  if (sectionType === "Banner") return "Home";
  if (sectionType === "FormDetail") return "Contact";
  if (sectionType === "WhyChooseUs") return "Why Choose Us";
  return sectionType.replace(/([a-z])([A-Z])/g, "$1 $2");
};

type SectionItem = {
  id?: string;
  page?: string;
  type: string;
  variant: string;
  data: Record<string, SectionData>;
};

type HeaderBackgroundType = "solid" | "gradient";
type TopbarBackgroundType = "solid" | "gradient";
type FooterBackgroundType = "solid" | "gradient";
type StickySectionType = "scroll" | "sticky";
type BannerBackgroundMode = "image" | "video" | "solid" | "gradient";
type EditSectionModalProps = {
  sectionId: string;
  sectionType: string;
  category: string;
  isSinglePage: boolean;
  sections: SectionItem[];
  onClose: () => void;
  onSave: (sectionType: string) => void;
  onSelectVariant: (type: string, variant: string) => void;
  onUpdateSectionData: (
    type: string,
    newData: Record<string, SectionData>,
  ) => void;
  initialTab?: string;
  /** When set, the content form shows only these JSON keys. */
  contentFields?: string[];
  editorTitle?: string;
};

type ImagePickerTarget = {
  title: string;
  currentValue: string;
  apply: (source: string, fileName: string) => void;
};

type LayoutOption = {
  id: string;
  name: string;
  isDatabase?: boolean;
  thumbnailUrl?: string | null;
};

const LazyDatabaseLayoutPreview = ({
  layout,
  category,
  liveContent,
  editorPart,
}: {
  layout: LayoutOption;
  category: string;
  /** Live section content (menu/logo/buttons) so layout cards match the site. */
  liveContent?: Record<string, unknown> | null;
  /** Events inner pages: preview one block, not the whole page. */
  editorPart?: number;
}) => {
  const previewRef = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const Component = sectionRegistry[layout.id];
  const preview = shouldLoad
    ? resolveLayoutPreview(layout.id, category)
    : null;
  const previewData = useMemo(() => {
    const base = (preview?.data || {}) as Record<string, unknown>;
    const withLive = !liveContent
      ? base
      : {
          ...base,
          ...(Array.isArray(liveContent.menu) ? { menu: liveContent.menu } : {}),
          ...(typeof liveContent.logo === "string" ? { logo: liveContent.logo } : {}),
          ...(typeof liveContent.logoImage === "string"
            ? { logoImage: liveContent.logoImage }
            : {}),
          ...(typeof liveContent.logoImageTitle === "string"
            ? { logoImageTitle: liveContent.logoImageTitle }
            : {}),
          ...(Array.isArray(liveContent.buttons)
            ? { buttons: liveContent.buttons }
            : {}),
          ...(typeof liveContent.phone === "string"
            ? { phone: liveContent.phone }
            : {}),
          ...(typeof liveContent.email === "string"
            ? { email: liveContent.email }
            : {}),
          ...(typeof liveContent.location === "string"
            ? { location: liveContent.location }
            : {}),
          ...(Array.isArray(liveContent.socialLinks)
            ? { socialLinks: liveContent.socialLinks }
            : {}),
          ...(typeof liveContent.headerBackgroundColor === "string"
            ? { headerBackgroundColor: liveContent.headerBackgroundColor }
            : {}),
          ...(typeof liveContent.headerTextColor === "string"
            ? { headerTextColor: liveContent.headerTextColor }
            : {}),
          ...(typeof liveContent.headerBackgroundType === "string"
            ? { headerBackgroundType: liveContent.headerBackgroundType }
            : {}),
          ...(typeof liveContent.headerGradientColor === "string"
            ? { headerGradientColor: liveContent.headerGradientColor }
            : {}),
          ...(Array.isArray(liveContent.footerColumns)
            ? { footerColumns: liveContent.footerColumns }
            : {}),
          ...(liveContent.footerContact
            ? { footerContact: liveContent.footerContact }
            : {}),
          ...(Array.isArray(liveContent.footerSocialLinks)
            ? { footerSocialLinks: liveContent.footerSocialLinks }
            : {}),
          ...(Array.isArray(liveContent.footerLegalLinks)
            ? { footerLegalLinks: liveContent.footerLegalLinks }
            : {}),
          ...(typeof liveContent.copyrightText === "string"
            ? { copyrightText: liveContent.copyrightText }
            : {}),
          ...(typeof liveContent.whatsappLink === "string"
            ? { whatsappLink: liveContent.whatsappLink }
            : {}),
          ...(typeof liveContent.callLink === "string"
            ? { callLink: liveContent.callLink }
            : {}),
          ...(typeof liveContent.footerBackgroundColor === "string"
            ? { footerBackgroundColor: liveContent.footerBackgroundColor }
            : {}),
          ...(typeof liveContent.footerTextColor === "string"
            ? { footerTextColor: liveContent.footerTextColor }
            : {}),
          ...(typeof liveContent.footerBackgroundType === "string"
            ? { footerBackgroundType: liveContent.footerBackgroundType }
            : {}),
          ...(typeof liveContent.footerGradientColor === "string"
            ? { footerGradientColor: liveContent.footerGradientColor }
            : {}),
          ...(typeof liveContent.footerMutedTextColor === "string"
            ? { footerMutedTextColor: liveContent.footerMutedTextColor }
            : {}),
          ...(typeof liveContent.title === "string"
            ? { title: liveContent.title }
            : {}),
          ...(typeof liveContent.pretitle === "string"
            ? { pretitle: liveContent.pretitle }
            : {}),
          ...(typeof liveContent.homeLabel === "string"
            ? { homeLabel: liveContent.homeLabel }
            : {}),
          ...(typeof liveContent.desc === "string" ? { desc: liveContent.desc } : {}),
          ...(typeof liveContent.desc2 === "string"
            ? { desc2: liveContent.desc2 }
            : {}),
        };
    return withTopbarLayoutSkin(layout.id, withLive);
  }, [layout.id, liveContent, preview?.data]);

  useEffect(() => {
    const element = previewRef.current;
    if (!element || shouldLoad) return;
    if (layout.thumbnailUrl && !Component) return;

    if (!("IntersectionObserver" in window)) {
      setShouldLoad(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setShouldLoad(true);
        observer.disconnect();
      },
      { rootMargin: "240px 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [Component, layout.thumbnailUrl, shouldLoad]);

  const showThumbnail = Boolean(layout.thumbnailUrl) && !Component;

  return (
    <div ref={previewRef} className="relative h-56 overflow-hidden bg-slate-100">
      {showThumbnail ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={layout.thumbnailUrl || ""}
          alt=""
          className="h-full w-full object-cover"
        />
      ) : null}
      {!shouldLoad && !showThumbnail ? (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100" />
      ) : null}
      {!showThumbnail && shouldLoad && Component ? (
        <div className="pointer-events-none h-[448px] w-[200%] origin-top-left scale-50 overflow-hidden bg-white">
          <Component data={previewData} editorPart={editorPart} />
        </div>
      ) : null}
      {!showThumbnail && shouldLoad && !Component ? (
        <div className="flex h-full items-center justify-center bg-white px-6 text-center">
          <div>
            <p className="text-sm font-semibold text-slate-700">{layout.name}</p>
            <p className="mt-1 text-xs text-slate-500">
              Preview component is not registered yet.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
};

const DatabaseLayoutOptionCard = ({
  layout,
  category,
  active,
  onSelect,
  liveContent,
  editorPart,
}: {
  layout: LayoutOption;
  category: string;
  active: boolean;
  onSelect: () => void;
  liveContent?: Record<string, unknown> | null;
  editorPart?: number;
}) => (
  <div
    role="button"
    tabIndex={0}
    onClick={onSelect}
    onKeyDown={(event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      onSelect();
    }}
    className={`relative w-full cursor-pointer overflow-hidden rounded-2xl border bg-white text-left transition hover:border-slate-400 ${
      active ? "border-gray-400 ring-2 ring-blue-500/20" : "border-gray-200"
    }`}
  >
    <SelectedLayoutBadge active={active} />
      <LazyDatabaseLayoutPreview
        layout={layout}
        category={category}
        liveContent={liveContent}
        editorPart={editorPart}
      />
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div>
        <p className="text-sm font-semibold text-slate-800">{layout.name}</p>
        <p className="mt-0.5 text-xs text-slate-500">
          {active ? "Currently selected" : "Click to use this layout"}
        </p>
      </div>
      <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600">
        Live preview
      </span>
    </div>
  </div>
);

const headerLayouts = [
  { id: "Header-1", name: "Header 1" },
  { id: "Header-2", name: "Header 2" },
  { id: "Header-5", name: "Realestate Header 1" },
  { id: "Header-6", name: "Realestate Header 2" },
];

const topbarLayouts = [
  { id: "Topbar-1", name: "Topbar 1" },
  { id: "Topbar-2", name: "Topbar 2" },
  { id: "Topbar-5", name: "Realestate Topbar 1" },
  { id: "Topbar-6", name: "Realestate Topbar 2" },
];

const bannerLayouts = [
  { id: "Banner-1", name: "Image Banner" },
  { id: "Banner-2", name: "Video Banner" },
  { id: "Banner-3", name: "Image Slider" },
  { id: "Banner-4", name: "Video Slider" },
  { id: "Banner-5", name: "Realestate Banner 1" },
  { id: "Banner-6", name: "Realestate Banner 2" },
];

const aboutLayouts = [
  { id: "About-1", name: "About 1" },
  { id: "About-2", name: "About 2" },
  { id: "About-5", name: "Realestate About 1" },
  { id: "About-6", name: "Realestate About 2" },
];

const aboutPageLayouts = [
  { id: "AboutPage-1", name: "About Page" },
  { id: "AboutPage-2", name: "About Page Two" },
  { id: "AboutPage-3", name: "About Page Three" },
  { id: "AboutPage-5", name: "Realestate About Page" },
];

const galleryPageLayouts = [
  { id: "GalleryPage-1", name: "Gallery Page" },
  { id: "GalleryPage-6", name: "Realestate Gallery Page" },
];

const servicePageLayouts = [
  { id: "ServicePage-1", name: "Service Page" },
  { id: "ServicePage-5", name: "Realestate Service Page" },
];

const contactPageLayouts = [
  { id: "ContactPage-1", name: "Contact Page" },
  { id: "ContactPage-2", name: "Contact Page Two" },
  { id: "ContactPage-5", name: "Realestate Contact Page" },
];

const breadcrumbLayouts = [
  { id: "Breadcrumb-1", name: "Breadcrumb 1" },
  { id: "Breadcrumb-2", name: "Breadcrumb 2" },
  { id: "Breadcrumb-3", name: "Breadcrumb 3" },
  { id: "Breadcrumb-4", name: "Breadcrumb 4" },
  { id: "Breadcrumb-5", name: "Realestate Inner Banner" },
];

const getDefaultBreadcrumbData = (variant: string): SectionData => {
  const shared = {
    homeLabel: "Home",
    title: "Page",
  };

  if (variant === "Breadcrumb-2" || variant === "Breadcrumb-4") {
    return {
      ...shared,
      desc: "",
      breadcrumbBackgroundColor: variant === "Breadcrumb-2" ? "#0668ff" : "#f8fafc",
      breadcrumbTextColor: variant === "Breadcrumb-2" ? "#ffffff" : "#0f172a",
    };
  }

  if (variant === "Breadcrumb-3") {
    return {
      ...shared,
      pretitle: "",
      desc: "",
      backgroundImage: "/bg1.jpg",
      backgroundImageTitle: "Breadcrumb background",
    };
  }

  return { ...shared, pretitle: "" };
};

const productLayouts = [
  { id: "Product-1", name: "Product 1" },
  { id: "Product-2", name: "Product 2" },
  { id: "Product-3", name: "Product 3" },
  { id: "Product-5", name: "Realestate Product 1" },
  { id: "Product-6", name: "Realestate Product 2" },
];

const formDetailLayouts = [
  { id: "FormDetail-1", name: "Form 1" },
  { id: "FormDetail-2", name: "Form 2" },
  { id: "FormDetail-3", name: "Form 3" },
  { id: "FormDetail-4", name: "Form 4" },
  { id: "FormDetail-5", name: "Realestate Form 1" },
  { id: "FormDetail-6", name: "Realestate Form 2" },
];

const footerLayouts = [
  { id: "Footer-1", name: "Footer 1" },
  { id: "Footer-5", name: "Realestate Footer 1" },
  { id: "Footer-6", name: "Realestate Footer 2" },
];

const layoutsBySection: Record<string, { id: string; name: string }[]> = {
  Topbar: topbarLayouts,
  Header: headerLayouts,
  Banner: bannerLayouts,
  Breadcrumb: breadcrumbLayouts,
  About: aboutLayouts,
  Product: productLayouts,
  FormDetail: formDetailLayouts,
  Footer: footerLayouts,
  WhyChooseUs: [
    { id: "WhyChooseUs-1", name: "Why Choose Us 1" },
    { id: "WhyChooseUs-2", name: "Why Choose Us 2" },
    { id: "WhyChooseUs-3", name: "Why Choose Us 3" },
    { id: "WhyChooseUs-4", name: "Why Choose Us 4" },
    { id: "WhyChooseUs-5", name: "Realestate Why Choose Us 1" },
    { id: "WhyChooseUs-6", name: "Realestate Why Choose Us 2" },
  ],
  Features: [{ id: "Features-5", name: "Realestate Features 1" }],
  FeaturedDev: [{ id: "FeaturedDev-5", name: "Realestate Featured Developers" }],
  InvestmentOpportunities: [
    { id: "InvestmentOpportunities-5", name: "Realestate Investment Opportunities" },
  ],
  Process: [{ id: "Process-5", name: "Realestate Process 1" }],
  Awards: [{ id: "Awards-5", name: "Realestate Awards 1" }],
  AwardsPage: [{ id: "AwardsPage-5", name: "Realestate Awards Page" }],
  MissionPage: [{ id: "MissionPage-5", name: "Realestate How We Work" }],
  MissionValues: [{ id: "MissionValues-5", name: "Realestate Mission Values" }],
  CsrPage: [{ id: "CsrPage-5", name: "Realestate CSR Impact" }],
  CsrPrograms: [{ id: "CsrPrograms-5", name: "Realestate CSR Programs" }],
  CareerPage: [{ id: "CareerPage-5", name: "Realestate Career Benefits" }],
  CareerJobs: [{ id: "CareerJobs-5", name: "Realestate Open Positions" }],
  ContactPage: [{ id: "ContactPage-5", name: "Realestate Contact Page" }],
  Stats: [{ id: "Stats-5", name: "Realestate Stats 1" }],
  CTA: [{ id: "CTA-5", name: "Realestate Call to Action" }],
  Gallery: [
    { id: "Gallery-1", name: "Gallery 1" },
    { id: "Gallery-2", name: "Gallery 2" },
    { id: "Gallery-3", name: "Gallery 3" },
    { id: "Gallery-4", name: "Gallery 4" },
    { id: "Gallery-5", name: "Gallery 5" },
    { id: "Gallery-6", name: "Gallery 6" },
    { id: "Gallery-7", name: "Realestate Gallery 1" },
    { id: "Gallery-8", name: "Realestate Gallery 2" },
  ],
  FAQ: [
    { id: "FAQ-1", name: "FAQ 1" },
    { id: "FAQ-2", name: "FAQ 2" },
    { id: "FAQ-3", name: "FAQ 3" },
    { id: "FAQ-4", name: "FAQ 4" },
    { id: "FAQ-5", name: "Realestate FAQ 1" },
    { id: "FAQ-6", name: "Realestate FAQ 2" },
  ],
  Testimonial: [
    { id: "Testimonial-1", name: "Our Clients 1" },
    { id: "Testimonial-2", name: "Our Clients 2" },
    { id: "Testimonial-3", name: "Our Clients 3" },
    { id: "Testimonial-5", name: "Realestate Clients 1" },
    { id: "Testimonial-6", name: "Realestate Clients 2" },
  ],
};

const pageLayoutsBySection: Record<string, { id: string; name: string }[]> = {
  About: aboutPageLayouts,
  Service: servicePageLayouts,
  Gallery: galleryPageLayouts,
  Contact: contactPageLayouts,
};

const MAX_MENU_LINKS = 10;
const MAX_DROPDOWN_LINKS = 10;
const MAX_MEGA_LINKS = 12;
const MAX_TOPBAR_SOCIAL_LINKS = SOCIAL_PLATFORM_OPTIONS.length;
const MAX_HEADER_BUTTONS = 3;
const MAX_BANNER_BUTTONS = 3;
const MAX_FORM_FIELDS = 5;
const MAX_LINK_TEXT_LENGTH = 20;

const safeHref = (href?: string | null) => (href ?? "").trim();

/** Placeholder / incomplete nav targets — keep in Header menu, not page inventory. */
const isPendingNavHref = (href?: string | null) => {
  const value = safeHref(href).toLowerCase();
  return !value || value === "/new-item" || value === "#new-item";
};

const isPortfolioNavLabel = (label?: string | null) => {
  const key = (label || "").trim().toLowerCase();
  return (
    key === "portfolio" ||
    key === "portfolios" ||
    key === "project" ||
    key === "projects"
  );
};

/** Fill theme Projects/Portfolio href so items are not treated as pending + stripped. */
const canonicalizePortfolioNavMenu = (
  menu: MenuItem[],
  templateId?: string | null,
  category?: string | null,
): MenuItem[] => {
  const nav = resolveThemePortfolioNavLink(templateId, category);
  return menu.map((item) => {
    const children = item.children?.length
      ? canonicalizePortfolioNavMenu(item.children, templateId, category)
      : item.children;
    if (!isPortfolioNavLabel(item.label)) {
      return children !== item.children ? { ...item, children } : item;
    }
    const href = safeHref(item.href).toLowerCase();
    const needsHref =
      isPendingNavHref(item.href) ||
      href === "#page-portfolio" ||
      href === "#portfolio" ||
      href === "/portfolio" ||
      href === "/projects";
    return {
      ...item,
      href: needsHref ? nav.href : item.href || nav.href,
      label: item.label?.trim() || nav.label,
      ...(children ? { children } : {}),
    };
  });
};

const filterPendingNavLinks = (links: PageLink[]): PageLink[] =>
  links.flatMap((link) => {
    if (isPendingNavHref(link.href)) return [];
    const children = link.children?.length
      ? filterPendingNavLinks(link.children)
      : undefined;
    return [
      {
        ...link,
        ...(children?.length ? { children } : { children: undefined }),
      },
    ];
  });

const toPageLinks = (menu: MenuItem[], limit = MAX_MENU_LINKS): PageLink[] =>
  menu.slice(0, limit).map((item) => ({
    label: item.label || "",
    href: safeHref(item.href),
    menuType: item.menuType,
    children: item.children
      ? toPageLinks(
          item.children,
          item.menuType === "mega" ? MAX_MEGA_LINKS : MAX_DROPDOWN_LINKS,
        )
      : undefined,
  }));

const getPageNames = (links: PageLink[]): string[] =>
  links.flatMap((link) => [
    link.label,
    ...(link.children ? getPageNames(link.children) : []),
  ]);

const getMediaKindFromKey = (key: string): "image" | "video" | null => {
  const normalizedKey = key.toLowerCase();

  if (
    normalizedKey.includes("title") ||
    normalizedKey.includes("alt") ||
    normalizedKey.includes("label") ||
    normalizedKey.includes("href")
  ) {
    return null;
  }

  if (normalizedKey === "poster") return "image";
  if (normalizedKey === "image" || normalizedKey.endsWith("image")) {
    return "image";
  }
  if (normalizedKey === "video" || normalizedKey.endsWith("video")) {
    return "video";
  }

  return null;
};

const getMediaUploadLabel = (
  value: unknown,
  mediaKind: "image" | "video",
) => {
  const text =
    typeof value === "string"
      ? value
      : value == null
        ? ""
        : String(value);
  if (!text) return mediaKind === "image" ? "No image chosen yet" : "No video chosen yet";

  return text.startsWith("data:") ? "Selected from your device" : text;
};

const sidebarItemsBySection: Record<string, string[]> = {
  Topbar: ["Topbar Content", "Topbar Layout", "Topbar Settings"],
  Header: [
    "Header Content",
    "Header Layout",
    "Header Settings",
    "Nav Menu",
  ],
  Banner: ["Banner Content", "Banner Layout"],
  Breadcrumb: ["Breadcrumb Content", "Breadcrumb Layout"],
  About: ["About Content", "About Layout"],
  Service: ["Service Content", "Service Layout"],
  Product: ["Product Content", "Product Layout"],
  WhyChooseUs: ["WhyChooseUs Content", "WhyChooseUs Layout"],
  Features: ["Features Content", "Features Layout"],
  FeaturedDev: ["FeaturedDev Content", "FeaturedDev Layout"],
  InvestmentOpportunities: [
    "InvestmentOpportunities Content",
    "InvestmentOpportunities Layout",
  ],
  Process: ["Process Content", "Process Layout"],
  Awards: ["Awards Content", "Awards Layout"],
  AwardsPage: ["AwardsPage Content", "AwardsPage Layout"],
  MissionPage: ["MissionPage Content", "MissionPage Layout"],
  MissionValues: ["MissionValues Content", "MissionValues Layout"],
  CsrPage: ["CsrPage Content", "CsrPage Layout"],
  CsrPrograms: ["CsrPrograms Content", "CsrPrograms Layout"],
  CareerPage: ["CareerPage Content", "CareerPage Layout"],
  CareerJobs: ["CareerJobs Content", "CareerJobs Layout"],
  ContactPage: ["ContactPage Content", "ContactPage Layout"],
  Stats: ["Stats Content", "Stats Layout"],
  CTA: ["CTA Content", "CTA Layout"],
  Gallery: ["Gallery Content", "Gallery Layout"],
  CountriesServe: ["Countries Content", "Countries Layout"],
  Contact: ["Contact Content", "Contact Layout"],
  FAQ: ["FAQ Content", "FAQ Layout"],
  Testimonial: ["Our Clients Content", "Our Clients Layout"],
  FormDetail: ["Form Content", "Form Layout"],
  Footer: ["Footer Content", "Footer Layout", "Footer Settings", "Floating Item"],
  BlogPage: ["BlogPage Content", "BlogPage Layout"],
  CustomSection: ["CustomSection Content", "CustomSection Layout"],
};

const componentContentFieldsByVariant: Record<string, string[]> = {
  "Breadcrumb-1": ["pretitle", "homeLabel", "title"],
  "Breadcrumb-2": ["homeLabel", "title", "desc", "breadcrumbBackgroundColor", "breadcrumbTextColor"],
  "Breadcrumb-3": ["pretitle", "homeLabel", "title", "desc", "backgroundImage", "backgroundImageTitle"],
  "Breadcrumb-4": ["homeLabel", "title", "desc", "breadcrumbBackgroundColor", "breadcrumbTextColor"],
  "Breadcrumb-5": ["pretitle", "title", "desc", "desc2"],
  "About-1": ["title", "desc", "backgroundImage", "backgroundImageTitle", "buttons"],
  "About-2": ["pretitle", "title", "subtitle", "desc", "backgroundImage", "backgroundImageTitle", "sideImage", "sideImageTitle", "philosophyTitle", "philosophyDesc", "buttons"],
  "About-3": ["title", "desc", "backgroundImage", "backgroundImageTitle", "buttons"],
  "About-4": ["pretitle", "title", "subtitle", "desc", "backgroundImage", "backgroundImageTitle", "sideImage", "sideImageTitle", "philosophyTitle", "philosophyDesc", "buttons"],
  "AboutPage-1": ["pretitle", "title", "subtitle", "desc", "desc2", "sideImage", "sideImageTitle", "philosophyTitle", "philosophyDesc"],
  "AboutPage-2": ["pretitle", "title", "desc", "desc2", "sideImage", "sideImageTitle"],
  "AboutPage-3": ["pretitle", "title", "subtitle", "desc", "desc2", "philosophyTitle", "philosophyDesc"],
  "AboutPage-5": [
    "subtitle",
    "title",
    "desc1",
    "desc2",
    "promises",
    "buttons",
    "sideImage",
    "sideImageTitle",
  ],
  "AboutPage-6": [
    "subtitle",
    "title",
    "desc1",
    "desc2",
    "promises",
    "buttons",
    "sideImage",
    "sideImageTitle",
  ],
  "BlogPage-1": ["title", "author", "category", "excerpt", "content", "image"],
  "BlogPage-2": ["title", "author", "category", "excerpt", "content", "image"],
  "BlogPage-3": ["title", "author", "category", "excerpt", "content", "image"],
  "BlogPage-4": ["title", "author", "category", "excerpt", "content", "image"],
  "BlogPage-5": ["title", "author", "category", "excerpt", "content", "image"],
  "ServicePage-1": ["pretitle", "title", "subtitle", "desc", "desc2", "sideImage", "sideImageTitle", "productSectionTitle", "productItems", "serviceSlides"],
  "Product-1": ["serviceSlides", "productFeatures", "productTotalPrice", "productShippingText"],
  "Product-2": ["productSectionTitle", "productItems"],
  "Product-3": ["pretitle", "title", "desc", "buttons", "productItems"],
  "WhyChooseUs-1": ["pretitle", "title", "desc", "whyChooseUsItems"],
  "WhyChooseUs-2": ["pretitle", "title", "desc", "whyChooseUsItems"],
  "WhyChooseUs-3": ["pretitle", "title", "desc", "whyChooseUsItems"],
  "WhyChooseUs-4": ["pretitle", "title", "desc", "whyChooseUsItems"],
  "WhyChooseUs-5": ["pretitle", "title", "desc", "whyChooseUsItems"],
  "WhyChooseUs-6": ["pretitle", "title", "desc", "whyChooseUsItems"],
  "Features-5": ["features"],
  "Features-6": ["features"],
  "FeaturedDev-5": ["pretitle", "title", "desc", "items"],
  "FeaturedDev-6": ["pretitle", "title", "desc", "items"],
  "InvestmentOpportunities-5": ["pretitle", "title", "desc", "items"],
  "Process-5": ["pretitle", "title", "desc", "steps", "button"],
  "Awards-5": ["pretitle", "title", "desc", "awardItems", "button"],
  "AwardsPage-5": ["contentPretitle", "contentTitle", "awardItems"],
  "AwardsPage-6": ["contentPretitle", "contentTitle", "awardItems"],
  "MissionPage-5": [
    "pillarsPretitle",
    "pillarsTitle",
    "sideImage",
    "sideImageTitle",
    "pillars",
  ],
  "MissionPage-6": [
    "pillarsPretitle",
    "pillarsTitle",
    "sideImage",
    "sideImageTitle",
    "pillars",
  ],
  "MissionValues-5": ["pretitle", "title", "values"],
  "MissionValues-6": ["pretitle", "title", "values"],
  "CsrPage-5": ["sideImage", "sideImageTitle", "impactStats"],
  "CsrPage-6": ["sideImage", "sideImageTitle", "impactStats"],
  "CsrPrograms-5": ["pretitle", "title", "programs"],
  "CsrPrograms-6": ["pretitle", "title", "programs"],
  "CareerPage-5": ["benefits"],
  "CareerPage-6": ["benefits"],
  "CareerJobs-5": [
    "pretitle",
    "title",
    "jobs",
    "formPretitle",
    "formTitle",
    "formFields",
    "applyLabel",
    "successTitle",
    "successDesc",
    "successButtonLabel",
  ],
  "CareerJobs-6": [
    "pretitle",
    "title",
    "jobs",
    "formPretitle",
    "formTitle",
    "formFields",
    "applyLabel",
    "successTitle",
    "successDesc",
    "successButtonLabel",
  ],
  "Stats-5": ["stats", "statsStyle"],
  "CTA-5": ["pretitle", "title", "description", "buttons"],
  "Gallery-1": ["title", "desc", "galleryItems"],
  "Gallery-2": ["title", "galleryItems"],
  "Gallery-3": ["title", "galleryItems"],
  "Gallery-4": ["pretitle", "title", "desc", "galleryItems"],
  "Gallery-5": ["title", "desc", "galleryItems"],
  "Gallery-6": ["title", "galleryItems"],
  "GalleryPage-1": ["pretitle", "title", "desc", "galleryItems"],
  "CountriesServe-1": ["pretitle", "title", "desc", "countriesServeItems", "countriesServeListings"],
  "CountriesServe-2": ["pretitle", "title", "desc", "countriesServeItems", "countriesServeListings"],
  "CountriesServe-3": ["pretitle", "title", "desc", "countriesServeItems", "countriesServeListings"],
  "CountriesServe-4": ["pretitle", "title", "desc", "countriesServeItems", "countriesServeListings"],
  "ContactPage-1": ["pretitle", "title", "desc", "sideImage", "sideImageTitle", "footerContact", "formFields", "formSubmitLabel"],
  "ContactPage-2": ["pretitle", "title", "desc", "footerContact", "formFields", "formSubmitLabel"],
  "ContactPage-5": [
    "contactPretitle",
    "contactTitle",
    "footerContact",
    "phoneLabel",
    "emailLabel",
    "officeLabel",
    "formPretitle",
    "formTitle",
    "formFields",
    "consentText",
    "privacyPolicyLabel",
    "formSubmitLabel",
    "successTitle",
    "successMessage",
    "successButtonLabel",
  ],
  "ContactPage-6": [
    "contactPretitle",
    "contactTitle",
    "footerContact",
    "phoneLabel",
    "emailLabel",
    "officeLabel",
    "formPretitle",
    "formTitle",
    "formFields",
    "consentText",
    "privacyPolicyLabel",
    "formSubmitLabel",
    "successTitle",
    "successMessage",
    "successButtonLabel",
  ],
  "Contact-5": [
    "pretitle",
    "title",
    "desc",
    "backgroundImage",
    "backgroundImageTitle",
    "formFields",
    "formSubmitLabel",
    "successMessage",
  ],
  "Contact-6": [
    "pretitle",
    "title",
    "desc",
    "backgroundImage",
    "backgroundImageTitle",
    "formFields",
    "formSubmitLabel",
    "successMessage",
  ],
  "FAQ-1": ["pretitle", "title", "desc", "faqItems"],
  "FAQ-2": ["title", "faqItems"],
  "FAQ-3": ["title", "faqItems"],
  "FAQ-4": ["title", "faqItems"],
  "FAQ-5": ["pretitle", "title", "desc", "faqItems"],
  "FAQ-6": ["title", "faqItems"],
  "Testimonial-1": ["pretitle", "title", "testimonialItems"],
  "Testimonial-2": ["pretitle", "title", "desc", "testimonialItems"],
  "Testimonial-3": ["pretitle", "title", "testimonialItems"],
  "Testimonial-5": ["pretitle", "title", "desc", "testimonialItems"],
  "Testimonial-6": ["pretitle", "title", "desc", "testimonialItems"],
  "FormDetail-1": ["pretitle", "title", "desc", "backgroundImage", "backgroundImageTitle", "sideImage", "galleryItems", "formFields", "formSubmitLabel"],
  "FormDetail-2": ["title", "formFields", "formSubmitLabel"],
  "FormDetail-3": ["title", "desc", "phone", "email", "location", "formFields", "formSubmitLabel"],
  "FormDetail-4": ["title", "desc", "formFields", "formSubmitLabel"],
};

const knownContentFieldsBySection: Record<string, Set<string>> = {
  Breadcrumb: new Set(["pretitle", "homeLabel", "title", "desc", "desc2", "breadcrumbBackgroundColor", "breadcrumbTextColor", "backgroundImage", "backgroundImageTitle"]),
  About: new Set(["pretitle", "title", "subtitle", "desc", "desc1", "desc2", "backgroundImage", "backgroundImageTitle", "sideImage", "sideImageTitle", "philosophyTitle", "philosophyDesc", "promises", "buttons"]),
  Service: new Set(["pretitle", "title", "subtitle", "desc", "desc2", "sideImage", "sideImageTitle", "productSectionTitle", "productItems", "serviceSlides"]),
  Product: new Set(["pretitle", "title", "desc", "buttons", "serviceSlides", "productFeatures", "productTotalPrice", "productShippingText", "productSectionTitle", "productItems"]),
  WhyChooseUs: new Set(["pretitle", "title", "desc", "whyChooseUsItems"]),
  Features: new Set(["features"]),
  FeaturedDev: new Set(["pretitle", "title", "desc", "items"]),
  InvestmentOpportunities: new Set(["pretitle", "title", "desc", "items"]),
  Process: new Set(["pretitle", "title", "desc", "steps", "button"]),
  Awards: new Set(["pretitle", "title", "desc", "awardItems", "button"]),
  AwardsPage: new Set([
    "contentPretitle",
    "contentTitle",
    "awardItems",
    "pretitle",
    "title",
    "desc",
    "button",
    "breadcrumb",
  ]),
  MissionPage: new Set([
    "pillarsPretitle",
    "pillarsTitle",
    "sideImage",
    "sideImageTitle",
    "pillars",
    "valuesPretitle",
    "valuesTitle",
    "values",
    "pretitle",
    "title",
    "desc",
    "desc2",
    "ctaPretitle",
    "ctaTitle",
    "ctaDesc",
    "ctaButton",
    "breadcrumb",
  ]),
  MissionValues: new Set([
    "pretitle",
    "title",
    "values",
    "valuesPretitle",
    "valuesTitle",
    "image",
  ]),
  CsrPage: new Set([
    "sideImage",
    "sideImageTitle",
    "impactStats",
    "pretitle",
    "title",
    "desc",
    "desc2",
    "programsPretitle",
    "programsTitle",
    "programs",
    "donateCta",
    "breadcrumb",
  ]),
  CsrPrograms: new Set([
    "pretitle",
    "title",
    "programs",
    "programsPretitle",
    "programsTitle",
  ]),
  CareerPage: new Set([
    "benefits",
    "pretitle",
    "title",
    "desc",
    "desc2",
    "sideImage",
    "sideImageTitle",
    "jobsPretitle",
    "jobsTitle",
    "jobs",
    "formPretitle",
    "formTitle",
    "formFields",
    "applyLabel",
    "successTitle",
    "successDesc",
    "successButtonLabel",
    "breadcrumb",
  ]),
  CareerJobs: new Set([
    "pretitle",
    "title",
    "jobs",
    "jobsPretitle",
    "jobsTitle",
    "formPretitle",
    "formTitle",
    "formFields",
    "applyLabel",
    "successTitle",
    "successDesc",
    "successButtonLabel",
  ]),
  ContactPage: new Set([
    "contactPretitle",
    "contactTitle",
    "footerContact",
    "phoneLabel",
    "emailLabel",
    "officeLabel",
    "formPretitle",
    "formTitle",
    "formFields",
    "consentText",
    "privacyPolicyLabel",
    "formSubmitLabel",
    "successTitle",
    "successMessage",
    "successButtonLabel",
    "pretitle",
    "title",
    "desc",
    "breadcrumb",
  ]),
  Stats: new Set(["stats", "statsStyle"]),
  CTA: new Set(["pretitle", "title", "description", "buttons"]),
  Gallery: new Set(["pretitle", "title", "desc", "galleryItems"]),
  CountriesServe: new Set([
    "pretitle",
    "title",
    "desc",
    "countriesServeItems",
    "countriesServeListings",
  ]),
  Contact: new Set([
    "pretitle",
    "title",
    "desc",
    "sideImage",
    "sideImageTitle",
    "footerContact",
    "formFields",
    "formSubmitLabel",
    "backgroundImage",
    "backgroundImageTitle",
    "successMessage",
    "email",
    "phone",
    "address",
    "location",
  ]),
  FAQ: new Set(["pretitle", "title", "desc", "faqItems"]),
  Testimonial: new Set(["pretitle", "title", "desc", "testimonialItems"]),
  FormDetail: new Set(["pretitle", "title", "desc", "backgroundImage", "backgroundImageTitle", "sideImage", "galleryItems", "phone", "email", "location", "formFields", "formSubmitLabel"]),
  BlogPage: new Set(["title", "author", "category", "excerpt", "content", "image", "layout"]),
};

const normalizeSectionType = (sectionType: string) => {
  const normalized = sectionType.trim().toLowerCase();
  const aliases: Record<string, string> = {
    faq: "FAQ",
    formdetail: "FormDetail",
    testimonial: "Testimonial",
    whychooseus: "WhyChooseUs",
    countriesserve: "CountriesServe",
    awardspage: "AwardsPage",
    missionpage: "MissionPage",
    missionvalues: "MissionValues",
    csrpage: "CsrPage",
    csrprograms: "CsrPrograms",
    careerpage: "CareerPage",
    careerjobs: "CareerJobs",
    contactpage: "ContactPage",
    cta: "CTA",
    featureddev: "FeaturedDev",
    investmentopportunities: "InvestmentOpportunities",
  };

  if (aliases[normalized]) return aliases[normalized];

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const getDefaultTab = (sectionType: string) =>
  sidebarItemsBySection[normalizeSectionType(sectionType)]?.[0] ??
  "Header Layout";

const formatSectionTitle = (sectionType: string) =>
  normalizeSectionType(sectionType);

const getEditorTabHelp = (
  tab: string,
  isSinglePage: boolean,
) => {
  if (tab === "Nav Menu") {
    return isSinglePage
      ? "Drag to reorder. Set the label, where it opens, and Link / Dropdown / Mega."
      : "Build your site menu — reorder links and choose pages or sections.";
  }
  if (tab.endsWith("Content")) {
    return "Edit the text, media, and buttons visitors see.";
  }
  if (tab.endsWith("Layout")) {
    return "Pick a layout style for this section.";
  }
  if (tab.includes("Settings")) {
    return "Fine-tune sticky behavior, colors, and display options.";
  }
  if (tab === "Floating Item" || tab === "External Link") {
    return "Manage WhatsApp, Call, Back to top, and other floating shortcuts.";
  }
  return `Adjust ${tab.toLowerCase()} options.`;
};

const SIDEBAR_TAB_HINTS: Record<string, string> = {
  "Header Content": "Logo & buttons",
  "Header Layout": "Style variants",
  "Header Settings": "Sticky & colors",
  "Nav Menu": "Site links",
  "Topbar Content": "Contact & social",
  "Topbar Layout": "Bar style",
  "Topbar Settings": "Sticky & colors",
  "Banner Content": "Hero text",
  "Banner Layout": "Hero style",
  "Breadcrumb Content": "Page path text",
  "Breadcrumb Layout": "Path style",
  "About Content": "Story & media",
  "About Layout": "Section style",
  "Service Content": "Offers & details",
  "Service Layout": "Section style",
  "Product Content": "Items & details",
  "Product Layout": "Section style",
  "WhyChooseUs Content": "Reasons & points",
  "WhyChooseUs Layout": "Section style",
  "Features Content": "Icons & points",
  "Features Layout": "Section style",
  "FeaturedDev Content": "Logos & names",
  "FeaturedDev Layout": "Section style",
  "InvestmentOpportunities Content": "Cards & copy",
  "InvestmentOpportunities Layout": "Section style",
  "Process Content": "Steps & copy",
  "Process Layout": "Section style",
  "Awards Content": "Badges & copy",
  "Awards Layout": "Section style",
  "AwardsPage Content": "Honours & badges",
  "AwardsPage Layout": "Section style",
  "MissionPage Content": "How we work",
  "MissionPage Layout": "Section style",
  "MissionValues Content": "Values",
  "MissionValues Layout": "Section style",
  "CsrPage Content": "Impact stats",
  "CsrPage Layout": "Section style",
  "CsrPrograms Content": "Programs",
  "CsrPrograms Layout": "Section style",
  "CareerPage Content": "Benefits",
  "CareerPage Layout": "Section style",
  "CareerJobs Content": "Jobs & form",
  "CareerJobs Layout": "Section style",
  "ContactPage Content": "Details & form",
  "ContactPage Layout": "Section style",
  "Stats Content": "Numbers & labels",
  "Stats Layout": "Section style",
  "CTA Content": "Buttons & copy",
  "CTA Layout": "Section style",
  "Gallery Content": "Photos & captions",
  "Gallery Layout": "Section style",
  "Contact Content": "Details & map",
  "Contact Layout": "Section style",
  "FAQ Content": "Questions & answers",
  "FAQ Layout": "Section style",
  "Our Clients Content": "Reviews & quotes",
  "Our Clients Layout": "Section style",
  "Form Content": "Fields & labels",
  "Form Layout": "Form style",
  "Footer Content": "Columns & links",
  "Footer Layout": "Footer style",
  "Footer Settings": "Colors & background",
  "Floating Item": "WhatsApp, call & top",
  "External Link": "WhatsApp, call & top",
  "BlogPage Content": "Post text",
  "BlogPage Layout": "Post style",
  "CustomSection Content": "Custom fields",
  "CustomSection Layout": "Section style",
};

const limitLinkText = (value: string) => value.slice(0, MAX_LINK_TEXT_LENGTH);

const clampBannerHeight = (height: number) => {
  if (!Number.isFinite(height)) return 70;

  return Math.min(100, Math.max(40, height));
};

const getDefaultBannerData = (
  variant: string,
  sourceData: SectionData = {},
): SectionData | undefined => {
  const sourceImage = sourceData.backgroundImage ?? "/bg1.jpg";
  const sourceVideo = sourceData.backgroundVideo ?? "/video.mp4";
  const sourceSlides = Array.isArray(sourceData.bannerSlides)
    ? sourceData.bannerSlides
    : [];

  if (variant === "Banner-4") {
    return {
      ...sourceData,
      bannerHeight: 70,
      bannerSlides: sourceSlides.length
        ? sourceSlides.map((slide) => ({
            ...slide,
            image: slide.image || sourceImage,
            video: slide.video || sourceVideo,
          }))
        : [
            {
              image: sourceImage,
              video: sourceVideo,
              alt: sourceData.backgroundImageTitle ?? "Category video slide",
              title: sourceData.title ?? "Category video banner",
              desc:
                sourceData.desc ??
                "Use category-specific motion behind every banner slide.",
              button: {
                label: "Explore",
                href: "#",
                variant: "primary",
              },
            },
          ],
    };
  }

  if (variant !== "Banner-3") return undefined;

  return {
    ...sourceData,
    bannerHeight: 70,
    bannerSlides: sourceSlides.length
      ? sourceSlides.map((slide) => ({
          ...slide,
          image: slide.image || sourceImage,
        }))
      : [
          {
            image: sourceImage,
            alt: sourceData.backgroundImageTitle ?? "Category slide",
            title: sourceData.title ?? "Category image slider",
            desc:
              sourceData.desc ??
              "Use category-specific images across every slider layout.",
            button: {
              label: "Explore",
              href: "#",
              variant: "primary",
            },
          },
        ],
  };
};

const getVisibleSocialLinks = (
  socialLinks: { label: SocialLinkData["label"]; href: string }[] = [],
) => socialLinks.slice(0, MAX_TOPBAR_SOCIAL_LINKS);

const SelectedLayoutBadge = ({ active }: { active: boolean }) =>
  active ? (
    <span className="pointer-events-none absolute right-3 top-3 z-30 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-emerald-500 text-white shadow-lg">
      <Check size={16} strokeWidth={3} />
    </span>
  ) : null;

const MediaUploadPreview = ({
  src,
  type,
}: {
  src: string;
  type: "image" | "video";
}) => (
  <div className="flex h-24 w-full flex-col overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50 sm:w-36">
    {src ? (
      type === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <video src={src} className="h-full w-full object-cover" muted playsInline />
      )
    ) : (
      <div className="flex h-full flex-col items-center justify-center gap-1 px-2 text-center">
        {type === "image" ? (
          <ImageIcon size={18} className="text-slate-400" />
        ) : (
          <Video size={18} className="text-slate-400" />
        )}
        <span className="text-[11px] font-medium text-slate-500">
          Preview
        </span>
      </div>
    )}
  </div>
);

type GenericFieldPath = Array<string | number>;

const isLinkDestinationFieldName = (fieldName: string) =>
  /^(href|link|url)$/i.test(fieldName.trim());

const getFriendlyFieldPlaceholder = (fieldName: string, label: string) => {
  const key = fieldName.trim().toLowerCase();
  if (key === "title" || key.endsWith("title")) return `Type ${label.toLowerCase()}…`;
  if (key === "pretitle" || key === "eyebrow") return "Short line above the title…";
  if (key === "desc" || key === "desc2" || key === "description") {
    return "Write a short supporting description…";
  }
  if (key === "answer") return "Write the answer…";
  if (key === "quote") return "Customer quote…";
  if (key === "name" || key === "author" || key === "clientname") {
    return "Person or company name…";
  }
  if (key === "label" || key === "buttonlabel") return "Button text…";
  if (key === "placeholder") return "Hint text inside the field…";
  if (
    key === "alt" ||
    key.endsWith("alt") ||
    key.includes("alttitle") ||
    key.includes("imagetitle")
  ) {
    return "Describe the image for accessibility…";
  }
  if (key === "phone") return "e.g. +91 98765 43210";
  if (key === "email") return "e.g. hello@company.com";
  if (key === "location" || key === "address") return "City, area, or full address…";
  if (key === "rating") return "0 – 5";
  if (isLinkDestinationFieldName(key)) return "Choose where this link goes…";
  return `Enter ${label.toLowerCase()}…`;
};

const BUTTON_ICON_OPTIONS = [
  { value: "none", label: "No icon" },
  { value: "arrow-right", label: "Arrow right" },
  { value: "arrow-left", label: "Arrow left" },
  { value: "plus", label: "Plus" },
  { value: "phone", label: "Phone" },
  { value: "mail", label: "Mail" },
  { value: "external-link", label: "External link" },
] as const;

const FEATURE_ICON_OPTIONS = [
  { value: "location", label: "Location" },
  { value: "verified", label: "Verified" },
  { value: "support", label: "Support" },
  { value: "delivery", label: "Delivery" },
] as const;

const WHY_CHOOSE_ICON_OPTIONS = [
  { value: "star", label: "Star" },
  { value: "heart", label: "Heart" },
  { value: "user", label: "User" },
  { value: "shield", label: "Shield" },
] as const;

const PROCESS_ICON_OPTIONS = [
  { value: "inspect", label: "Inspect" },
  { value: "quote", label: "Quote" },
  { value: "finish", label: "Finish" },
  { value: "quality", label: "Quality" },
] as const;

const MISSION_VALUE_ICON_OPTIONS = [
  { value: "scale", label: "Scale" },
  { value: "verified", label: "Verified" },
  { value: "handshake", label: "Handshake" },
  { value: "home", label: "Home" },
  { value: "shield", label: "Shield" },
  { value: "star", label: "Star" },
  { value: "heart", label: "Heart" },
  { value: "users", label: "Users" },
  { value: "phone", label: "Phone" },
  { value: "key", label: "Key" },
  { value: "building", label: "Building" },
  { value: "clock", label: "Clock" },
  { value: "award", label: "Award" },
  { value: "map-pin", label: "Map pin" },
] as const;

const missionValueIconComponents: Record<
  string,
  ComponentType<{ size?: number; className?: string }>
> = {
  scale: Scale,
  verified: BadgeCheck,
  handshake: Handshake,
  home: Home,
  shield: Shield,
  star: Star,
  heart: Heart,
  users: Users,
  phone: Phone,
  key: Key,
  building: Building2,
  clock: Clock,
  award: Award,
  "map-pin": MapPin,
};

const MissionValueIconPicker = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected =
    MISSION_VALUE_ICON_OPTIONS.find((option) => option.value === value) ||
    MISSION_VALUE_ICON_OPTIONS[0];
  const SelectedIcon = missionValueIconComponents[selected.value];

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  return (
    <div ref={rootRef} className="relative mt-1.5">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex h-9 w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 text-left text-xs text-slate-800 outline-none transition focus:border-[#315ff4] focus:ring-2 focus:ring-[#315ff4]/15"
        aria-label="Value icon"
        aria-expanded={open}
      >
        {SelectedIcon ? <SelectedIcon size={16} className="shrink-0 text-slate-700" /> : null}
        <span className="flex-1 truncate">{selected.label}</span>
        <ChevronDown size={14} className="shrink-0 text-slate-400" />
      </button>
      {open ? (
        <div className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-[0_8px_24px_rgba(15,23,42,0.12)]">
          {MISSION_VALUE_ICON_OPTIONS.map((option) => {
            const Icon = missionValueIconComponents[option.value];
            const isActive = option.value === selected.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs ${
                  isActive
                    ? "bg-blue-50 font-semibold text-[#244fe0]"
                    : "text-slate-800 hover:bg-slate-50"
                }`}
              >
                {Icon ? <Icon size={16} className="shrink-0" /> : null}
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};

const BUTTON_ICON_POSITION_OPTIONS = [
  { value: "before", label: "Before text" },
  { value: "after", label: "After text" },
] as const;

const isButtonIconFieldName = (fieldName: string) =>
  /^icon$/i.test(fieldName.trim());
const isButtonIconPositionFieldName = (fieldName: string) =>
  /^iconPosition$/i.test(fieldName.trim());
const isFeatureIconPath = (path: GenericFieldPath) =>
  path.length >= 2 && path[0] === "features" && path[path.length - 1] === "icon";
const isWhyChooseUsIconPath = (path: GenericFieldPath) =>
  path.length >= 2 &&
  path[0] === "whyChooseUsItems" &&
  path[path.length - 1] === "icon";
const isProcessIconPath = (path: GenericFieldPath) =>
  path.length >= 2 && path[0] === "steps" && path[path.length - 1] === "icon";
const isMissionValueIconPath = (path: GenericFieldPath) =>
  path.length >= 2 && path[0] === "values" && path[path.length - 1] === "icon";

const sortObjectEntriesByPreferredOrder = (
  entries: Array<[string, unknown]>,
  preferredOrder: string[],
) => {
  entries.sort((left, right) => {
    const leftIndex = preferredOrder.indexOf(left[0]);
    const rightIndex = preferredOrder.indexOf(right[0]);
    const leftRank = leftIndex === -1 ? preferredOrder.length : leftIndex;
    const rightRank = rightIndex === -1 ? preferredOrder.length : rightIndex;
    return leftRank - rightRank;
  });
  return entries;
};

const contentFieldCardClass =
  "rounded-xl border border-slate-200/90 bg-white p-3 shadow-[0_4px_18px_rgba(15,23,42,0.04)] sm:p-3.5";
const contentFieldLabelClass =
  "block text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-500";
const contentFieldInputClass =
  "mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#315ff4] focus:ring-2 focus:ring-[#315ff4]/15";
const contentFieldTextareaClass =
  "mt-1.5 min-h-20 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#315ff4] focus:ring-2 focus:ring-[#315ff4]/15";
const contentAddButtonClass =
  "inline-flex items-center gap-1 rounded-lg bg-[#315ff4] px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-[0_4px_12px_rgba(49,95,244,0.22)] transition hover:bg-[#244fe0]";
const contentMediaButtonClass =
  "flex min-h-9 w-full items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50/90 px-2.5 py-2 text-left text-xs text-slate-800 transition hover:border-[#315ff4] hover:bg-blue-50/50 focus:border-[#315ff4] focus:outline-none focus:ring-2 focus:ring-[#315ff4]/15";

function ContentFieldCard({
  label,
  hint,
  action,
  children,
}: {
  label: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={contentFieldCardClass}>
      <div className="mb-0.5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <label className={contentFieldLabelClass}>{label}</label>
          {hint ? (
            <p className="mt-0.5 text-[10px] leading-4 text-slate-400">{hint}</p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

const ContentMediaPickButton = ({
  hasFile,
  mediaKind,
  fileLabel,
  onClick,
  children,
}: {
  hasFile: boolean;
  mediaKind: "image" | "video";
  fileLabel: string;
  onClick?: () => void;
  children?: ReactNode;
}) => {
  const Icon = mediaKind === "image" ? ImageIcon : Video;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative ${contentMediaButtonClass}`}
    >
      <span
        className={`grid size-7 shrink-0 place-items-center rounded-md ${
          hasFile
            ? "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100"
            : "bg-blue-50 text-[#315ff4] ring-1 ring-blue-100"
        }`}
      >
        {hasFile ? <Check size={13} /> : <Icon size={13} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold text-slate-800">
          {hasFile
            ? `Change ${mediaKind}`
            : mediaKind === "image"
              ? "Choose image"
              : "Upload video"}
        </span>
        <span className="mt-0.5 block truncate text-[10px] text-slate-500">
          {hasFile
            ? fileLabel
            : mediaKind === "image"
              ? "Pick from library or upload"
              : "Click to select a video file"}
        </span>
      </span>
      <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-white px-2 py-0.5 text-[10px] font-semibold text-[#315ff4] ring-1 ring-slate-200">
        <Upload size={11} />
        Browse
      </span>
      {children}
    </button>
  );
};

const HrefDestinationButton = ({
  value,
  onClick,
  className = "",
}: {
  value: string;
  onClick: () => void;
  className?: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-2.5 text-left text-xs outline-none transition hover:border-[#315ff4] hover:bg-blue-50/40 focus:border-[#315ff4] focus:ring-2 focus:ring-[#315ff4]/15 ${className}`}
    title="Choose link destination"
  >
    <span className="flex min-w-0 items-center gap-1.5">
      <Link2 size={13} className="shrink-0 text-[#315ff4]" />
      <span
        className={`min-w-0 truncate ${
          value ? "font-medium text-slate-800" : "text-slate-400"
        }`}
      >
        {value || "Choose where this opens…"}
      </span>
    </span>
    <ChevronDown size={14} className="shrink-0 text-slate-400" />
  </button>
);

const scrollContentAccordionIntoView = (node: HTMLElement | null) => {
  if (!node) return;

  const scrollParent = node.closest(
    "[data-section-editor-scroll]",
  ) as HTMLElement | null;

  if (scrollParent) {
    const parentRect = scrollParent.getBoundingClientRect();
    const nodeRect = node.getBoundingClientRect();
    const nextTop =
      scrollParent.scrollTop + (nodeRect.top - parentRect.top) - 12;
    scrollParent.scrollTo({
      top: Math.max(0, nextTop),
      behavior: "smooth",
    });
    return;
  }

  node.scrollIntoView({ behavior: "smooth", block: "start", inline: "nearest" });
};

function useContentAccordion(itemCount: number) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(
    itemCount > 0 ? 0 : null,
  );
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);
  const previousCountRef = useRef(itemCount);

  useEffect(() => {
    const previousCount = previousCountRef.current;
    previousCountRef.current = itemCount;

    if (itemCount <= 0) {
      setExpandedIndex(null);
      return;
    }

    if (itemCount > previousCount) {
      const nextIndex = itemCount - 1;
      setExpandedIndex(nextIndex);
      const timer = window.setTimeout(() => {
        scrollContentAccordionIntoView(itemRefs.current[nextIndex] ?? null);
      }, 140);
      return () => window.clearTimeout(timer);
    }

    setExpandedIndex((current) => {
      if (current == null) return current;
      if (current >= itemCount) return itemCount - 1;
      return current;
    });
  }, [itemCount]);

  const toggleIndex = (index: number) => {
    setExpandedIndex((current) => (current === index ? null : index));
  };

  const setItemRef = (index: number, node: HTMLDivElement | null) => {
    itemRefs.current[index] = node;
  };

  return { expandedIndex, setExpandedIndex, toggleIndex, setItemRef };
}

function ContentAccordionItem({
  title,
  summary,
  open,
  onToggle,
  onDelete,
  deleteAriaLabel,
  itemRef,
  children,
}: {
  title: string;
  summary?: string;
  open: boolean;
  onToggle: () => void;
  onDelete?: () => void;
  deleteAriaLabel?: string;
  itemRef?: (node: HTMLDivElement | null) => void;
  children: ReactNode;
}) {
  return (
    <div
      ref={itemRef}
      className={`overflow-hidden rounded-xl border bg-slate-50/50 ring-1 transition ${
        open
          ? "border-[#315ff4]/35 ring-blue-100"
          : "border-slate-200 ring-slate-100"
      }`}
    >
      <div className="flex items-center gap-1.5 p-2">
        <button
          type="button"
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1 py-0.5 text-left transition hover:bg-white/80"
          aria-expanded={open}
        >
          <span
            className={`grid size-7 shrink-0 place-items-center rounded-md border bg-white text-slate-500 transition ${
              open ? "border-blue-200 text-[#315ff4]" : "border-slate-200"
            }`}
          >
            <ChevronDown
              size={14}
              className={`transition-transform ${open ? "rotate-180" : ""}`}
            />
          </span>
          <span className="min-w-0">
            <span className="block text-xs font-semibold text-slate-800">
              {title}
            </span>
            {!open && summary ? (
              <span className="mt-0.5 block truncate text-[10px] text-slate-500">
                {summary}
              </span>
            ) : (
              <span className="mt-0.5 block text-[10px] text-slate-400">
                {open ? "Editing — click to fold" : "Click to unfold"}
              </span>
            )}
          </span>
        </button>
        {onDelete ? (
          <button
            type="button"
            onClick={onDelete}
            className="grid size-7 shrink-0 place-items-center rounded-lg border border-red-100 bg-white text-red-600 transition hover:bg-red-50"
            aria-label={deleteAriaLabel ?? "Delete item"}
          >
            <Trash size={13} />
          </button>
        ) : null}
      </div>
      {open ? (
        <div className="space-y-2.5 border-t border-slate-200/80 bg-white/70 px-2.5 pb-2.5 pt-2.5">
          {children}
        </div>
      ) : null}
    </div>
  );
}

type HandledFieldObject = {
  [field: string]: HandledFieldSchema;
};

type HandledFieldSchema = true | HandledFieldObject;

type AutomaticContentField = {
  fieldName: string;
  value: unknown;
  path: GenericFieldPath;
};

const specializedContentFieldSchemas: Record<string, HandledFieldObject> = {
  Topbar: {
    topbarBackgroundType: true,
    topbarType: true,
    topbarBackgroundColor: true,
    topbarGradientColor: true,
    topbarTextColor: true,
    text: true,
    phone: true,
    email: true,
    location: true,
    hiddenContentFields: true,
    address: true,
    callLink: true,
    whatsappLink: true,
    socialLinks: {
      $items: { label: true, href: true },
    },
  },
  Header: {
    logo: true,
    logoImage: true,
    logoImageTitle: true,
    headerBackgroundType: true,
    headerType: true,
    headerBackgroundColor: true,
    headerGradientColor: true,
    headerTextColor: true,
    menu: true,
    buttons: {
      $items: {
        label: true,
        href: true,
        variant: true,
        icon: true,
        iconPosition: true,
        openInNewTab: true,
      },
    },
  },
  Banner: {
    backgroundImage: true,
    backgroundImageTitle: true,
    pretitle: true,
    title: true,
    desc: true,
    overlayColor: true,
    titleColor: true,
    bannerBackgroundMode: true,
    bannerBackgroundColor: true,
    bannerGradientColor: true,
    backgroundVideo: true,
    bannerHeight: true,
    buttons: {
      $items: {
        label: true,
        href: true,
        variant: true,
        icon: true,
        iconPosition: true,
        openInNewTab: true,
      },
    },
    bannerSlides: {
      $items: {
        image: true,
        video: true,
        alt: true,
        pretitle: true,
        title: true,
        desc: true,
        button: {
          label: true,
          href: true,
          variant: true,
          icon: true,
          iconPosition: true,
          openInNewTab: true,
        },
        buttons: {
          $items: {
            label: true,
            href: true,
            variant: true,
            icon: true,
            iconPosition: true,
            openInNewTab: true,
          },
        },
      },
    },
    smartSearch: true,
  },
  FormDetail: {
    pretitle: true,
    title: true,
    desc: true,
    formSubmitLabel: true,
    formFields: {
      $items: { label: true, type: true, placeholder: true },
    },
  },
  Footer: {
    logo: true,
    logoImage: true,
    logoImageTitle: true,
    footerBackgroundType: true,
    footerBackgroundColor: true,
    footerGradientColor: true,
    footerTextColor: true,
    footerMutedTextColor: true,
    footerColumns: {
      $items: {
        title: true,
        links: { $items: { label: true, href: true } },
      },
    },
    whatsappLink: true,
    callLink: true,
    floatingItems: true,
  },
};

const collectAutomaticContentFields = (
  value: unknown,
  schema: HandledFieldSchema | undefined,
  path: GenericFieldPath,
  fieldName: string,
): AutomaticContentField[] => {
  if (schema === true) return [];

  if (!schema) return [{ fieldName, value, path }];

  if (Array.isArray(value)) {
    const itemSchema = schema.$items;

    if (!itemSchema) return [{ fieldName, value, path }];

    return value.flatMap((item, index) =>
      collectAutomaticContentFields(
        item,
        itemSchema,
        [...path, index],
        `Item ${index + 1}`,
      ),
    );
  }

  if (typeof value === "object" && value !== null) {
    return Object.entries(value).flatMap(([childName, childValue]) =>
      collectAutomaticContentFields(
        childValue,
        schema[childName],
        [...path, childName],
        childName,
      ),
    );
  }

  return [{ fieldName, value, path }];
};

type GenericFieldEditorProps = {
  fieldName: string;
  value: unknown;
  path: GenericFieldPath;
  sectionType: string;
  onChange: (path: GenericFieldPath, value: unknown) => void;
  onMediaChange: (
    path: GenericFieldPath,
    fieldName: string,
    file: File,
  ) => void;
  onImagePickerRequest: (
    path: GenericFieldPath,
    fieldName: string,
    currentValue: string,
  ) => void;
  onOpenHrefPicker?: (path: GenericFieldPath, currentValue: string) => void;
  onAddArrayItem?: (path: GenericFieldPath) => void;
  onDeleteArrayItem?: (path: GenericFieldPath, index: number) => void;
  availablePageNames?: string[];
};

const userManageableCollectionFields = new Set([
  "productItems",
  "serviceSlides",
  "testimonialItems",
  "faqItems",
  "galleryItems",
  "features",
  "whyChooseUsItems",
  "steps",
  "awardItems",
  "pillars",
  "values",
  "impactStats",
  "programs",
  "benefits",
  "jobs",
  "stats",
  "promises",
  "formFields",
]);

const formatFieldLabel = (fieldName: string) =>
  fieldName
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (letter) => letter.toUpperCase());

const getCollectionItemSummary = (item: unknown) => {
  if (!item || typeof item !== "object") return undefined;
  const record = item as Record<string, unknown>;
  const candidates = [
    record.title,
    record.question,
    record.name,
    record.label,
    record.productTitle,
    record.quote,
    record.desc,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }
  return undefined;
};

const GenericArrayFieldEditor = ({
  fieldName,
  value,
  path,
  sectionType,
  onChange,
  onMediaChange,
  onImagePickerRequest,
  onOpenHrefPicker,
  onAddArrayItem,
  onDeleteArrayItem,
  availablePageNames = [],
}: GenericFieldEditorProps & { value: unknown[] }) => {
    const canManageItems =
      path.length === 1 &&
      (userManageableCollectionFields.has(fieldName) ||
        (fieldName === "items" &&
          (sectionType === "FeaturedDev" ||
            sectionType === "InvestmentOpportunities"))) &&
    Boolean(onAddArrayItem) &&
    Boolean(onDeleteArrayItem);
  const maxItems =
    fieldName === "features" ||
    fieldName === "whyChooseUsItems" ||
    fieldName === "steps" ||
    fieldName === "stats" ||
    fieldName === "impactStats" ||
    fieldName === "benefits"
      ? 4
      : fieldName === "formFields" ||
          (fieldName === "awardItems" && sectionType === "Awards")
        ? 5
        : undefined;
  const atMaxItems =
    typeof maxItems === "number" ? value.length >= maxItems : false;
  const { expandedIndex, toggleIndex, setItemRef } = useContentAccordion(
    value.length,
  );

    return (
    <section className={`${contentFieldCardClass} space-y-4`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h4 className="text-xs font-semibold text-slate-800">
            {fieldName === "promises" ? "List" : formatFieldLabel(fieldName)}
          </h4>
          <p className="mt-0.5 text-[10px] text-slate-500">
            {value.length
              ? typeof maxItems === "number"
                ? `${value.length}/${maxItems} items · fold others while editing`
                : `${value.length} item${value.length === 1 ? "" : "s"} · fold others while editing`
              : typeof maxItems === "number"
                ? `Add up to ${maxItems} items visitors will see`
              : "Add items visitors will see"}
          </p>
        </div>
          {canManageItems && (
            <button
              type="button"
            onClick={() => {
              if (atMaxItems) return;
              onAddArrayItem?.(path);
            }}
            disabled={atMaxItems}
            className={`${contentAddButtonClass} disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none`}
            >
              <Plus size={14} />
            Add item
            </button>
          )}
        </div>
        {value.length ? (
          <div className="space-y-3">
          {value.map((item, index) => {
            const open = expandedIndex === index;
            return (
              <ContentAccordionItem
                key={`${fieldName}-${index}`}
                title={`Item ${index + 1}`}
                summary={getCollectionItemSummary(item)}
                open={open}
                onToggle={() => toggleIndex(index)}
                onDelete={
                  canManageItems
                    ? () => onDeleteArrayItem?.(path, index)
                    : undefined
                }
                deleteAriaLabel={`Delete ${formatFieldLabel(fieldName)} item ${index + 1}`}
                itemRef={(node) => setItemRef(index, node)}
              >
                <GenericFieldEditor
                  fieldName={`Item ${index + 1}`}
                  value={item}
                  path={[...path, index]}
                  sectionType={sectionType}
                  onChange={onChange}
                  onMediaChange={onMediaChange}
                  onImagePickerRequest={onImagePickerRequest}
                  onOpenHrefPicker={onOpenHrefPicker}
                  onAddArrayItem={onAddArrayItem}
                  onDeleteArrayItem={onDeleteArrayItem}
                  availablePageNames={availablePageNames}
                />
              </ContentAccordionItem>
            );
          })}
          </div>
        ) : (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-8 text-center">
          <p className="text-xs font-medium text-slate-700">No items yet</p>
          <p className="mt-1 text-[10px] text-slate-500">
            Add the first item — visitors will see it on the site.
          </p>
          {canManageItems && (
            <button
              type="button"
              onClick={() => onAddArrayItem?.(path)}
              className={`mt-4 ${contentAddButtonClass}`}
            >
              <Plus size={14} />
              Add first item
            </button>
          )}
        </div>
        )}
      </section>
  );
};

const GenericFieldEditor = ({
  fieldName,
  value,
  path,
  sectionType,
  onChange,
  onMediaChange,
  onImagePickerRequest,
  onOpenHrefPicker,
  onAddArrayItem,
  onDeleteArrayItem,
  availablePageNames = [],
}: GenericFieldEditorProps) => {
  if (Array.isArray(value)) {
    return (
      <GenericArrayFieldEditor
        fieldName={fieldName}
        value={value}
        path={path}
        sectionType={sectionType}
        onChange={onChange}
        onMediaChange={onMediaChange}
        onImagePickerRequest={onImagePickerRequest}
        onOpenHrefPicker={onOpenHrefPicker}
        onAddArrayItem={onAddArrayItem}
        onDeleteArrayItem={onDeleteArrayItem}
        availablePageNames={availablePageNames}
      />
    );
  }

  if (typeof value === "object" && value !== null) {
    return (
      <div className="space-y-3.5">
        {fieldName.startsWith("Item ") && (
          <h5 className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
            {fieldName}
          </h5>
        )}
        {(() => {
          let entries = Object.entries(value);
          if (path[0] === "breadcrumb" && path.length === 2) {
            entries = entries.filter(
              ([key]) => key === "label" || key === "href",
            );
          }
          const isProductItem =
            path.length === 2 &&
            (path[0] === "productItems" || path[0] === "serviceSlides" || path[0] === "productSlides");
          const isFeatureItem = path.length === 2 && path[0] === "features";
          const isWhyChooseUsItem =
            path.length === 2 && path[0] === "whyChooseUsItems";
          const isFeaturedDevItem =
            sectionType === "FeaturedDev" &&
            path.length === 2 &&
            path[0] === "items";
          const isInvestmentItem =
            sectionType === "InvestmentOpportunities" &&
            path.length === 2 &&
            path[0] === "items";
          const isProcessStep =
            sectionType === "Process" &&
            path.length === 2 &&
            path[0] === "steps";
          const isAwardItem =
            sectionType === "Awards" &&
            path.length === 2 &&
            path[0] === "awardItems";
          const isAwardsPageItem =
            sectionType === "AwardsPage" &&
            path.length === 2 &&
            path[0] === "awardItems";
          const isMissionPillar =
            sectionType === "MissionPage" &&
            path.length === 2 &&
            path[0] === "pillars";
          const isMissionValue =
            sectionType === "MissionValues" &&
            path.length === 2 &&
            path[0] === "values";
          const isCsrImpactStat =
            sectionType === "CsrPage" &&
            path.length === 2 &&
            path[0] === "impactStats";
          const isCsrProgram =
            sectionType === "CsrPrograms" &&
            path.length === 2 &&
            path[0] === "programs";
          const isCareerBenefit =
            sectionType === "CareerPage" &&
            path.length === 2 &&
            path[0] === "benefits";
          const isCareerJob =
            sectionType === "CareerJobs" &&
            path.length === 2 &&
            path[0] === "jobs";
          const isStatItem =
            sectionType === "Stats" &&
            path.length === 2 &&
            path[0] === "stats";
          const isPromiseItem = path.length === 2 && path[0] === "promises";
          const isFaqItem = path.length === 2 && path[0] === "faqItems";
          const isFormFieldItem = path.length === 2 && path[0] === "formFields";

          if (isProductItem) {
            const existingLinkIndex = entries.findIndex(
              ([key]) => key === "link",
            );
            const linkEntry =
              existingLinkIndex >= 0
                ? entries.splice(existingLinkIndex, 1)[0]
                : (["link", ""] as [string, unknown]);
            const altIndex = entries.findIndex(([key]) => key === "alt");
            entries.splice(
              altIndex >= 0 ? altIndex + 1 : entries.length,
              0,
              linkEntry,
            );
          }

          if (isFeatureItem) {
            sortObjectEntriesByPreferredOrder(entries, [
              "icon",
              "title",
              "desc",
              "image",
            ]);
          }

          if (isWhyChooseUsItem) {
            if (!entries.some(([key]) => key === "icon")) {
              entries = [["icon", ""], ...entries];
            }
            sortObjectEntriesByPreferredOrder(entries, [
              "icon",
              "title",
              "desc",
              "stat",
              "image",
            ]);
          }

          if (isFeaturedDevItem) {
            entries = entries.filter(
              ([key]) => key === "image" || key === "alt",
            );
            sortObjectEntriesByPreferredOrder(entries, ["image", "alt"]);
          }

          if (isInvestmentItem) {
            if (!entries.some(([key]) => key === "href")) {
              entries = [...entries, ["href", "/contact"]];
            }
            sortObjectEntriesByPreferredOrder(entries, [
              "image",
              "alt",
              "title",
              "location",
              "yieldLabel",
              "desc",
              "href",
            ]);
          }

          if (isProcessStep) {
            if (!entries.some(([key]) => key === "icon")) {
              entries = [["icon", ""], ...entries];
            }
            entries = entries.filter(
              ([key]) =>
                key === "icon" ||
                key === "title" ||
                key === "desc" ||
                key === "image",
            );
            sortObjectEntriesByPreferredOrder(entries, [
              "icon",
              "title",
              "desc",
              "image",
            ]);
          }

          if (isAwardItem) {
            entries = entries.filter(
              ([key]) =>
                key === "image" ||
                key === "year" ||
                key === "title" ||
                key === "org" ||
                key === "alt",
            );
            sortObjectEntriesByPreferredOrder(entries, [
              "image",
              "year",
              "title",
              "org",
              "alt",
            ]);
          }

          if (isAwardsPageItem) {
            entries = entries.filter(
              ([key]) =>
                key === "image" ||
                key === "year" ||
                key === "org" ||
                key === "title" ||
                key === "desc",
            );
            sortObjectEntriesByPreferredOrder(entries, [
              "image",
              "year",
              "org",
              "title",
              "desc",
            ]);
          }

          if (isMissionPillar) {
            entries = entries.filter(
              ([key]) => key === "title" || key === "desc",
            );
            sortObjectEntriesByPreferredOrder(entries, ["title", "desc"]);
          }

          if (isMissionValue) {
            if (!entries.some(([key]) => key === "icon")) {
              entries = [["icon", ""], ...entries];
            }
            entries = entries.filter(
              ([key]) => key === "icon" || key === "title" || key === "desc",
            );
            sortObjectEntriesByPreferredOrder(entries, [
              "icon",
              "title",
              "desc",
            ]);
          }

          if (isCsrImpactStat) {
            entries = entries.filter(
              ([key]) => key === "stat" || key === "label",
            );
            sortObjectEntriesByPreferredOrder(entries, ["stat", "label"]);
          }

          if (isCsrProgram) {
            entries = entries.filter(
              ([key]) =>
                key === "image" ||
                key === "amount" ||
                key === "title" ||
                key === "desc",
            );
            sortObjectEntriesByPreferredOrder(entries, [
              "image",
              "amount",
              "title",
              "desc",
            ]);
          }

          if (isCareerBenefit) {
            entries = entries.filter(
              ([key]) => key === "title" || key === "desc",
            );
            sortObjectEntriesByPreferredOrder(entries, ["title", "desc"]);
          }

          if (isCareerJob) {
            entries = entries.filter(
              ([key]) =>
                key === "title" ||
                key === "location" ||
                key === "type" ||
                key === "desc",
            );
            sortObjectEntriesByPreferredOrder(entries, [
              "title",
              "location",
              "type",
              "desc",
            ]);
          }

          if (isStatItem) {
            entries = entries.filter(
              ([key]) => key === "stat" || key === "label",
            );
            sortObjectEntriesByPreferredOrder(entries, ["stat", "label"]);
          }

          if (isPromiseItem) {
            entries = entries.filter(([key]) => key === "title");
            sortObjectEntriesByPreferredOrder(entries, ["title"]);
          }

          if (isFaqItem) {
            entries = entries.filter(
              ([key]) => key === "question" || key === "answer",
            );
            sortObjectEntriesByPreferredOrder(entries, ["question", "answer"]);
          }

          if (isFormFieldItem) {
            if (!entries.some(([key]) => key === "type")) {
              entries = [...entries, ["type", "text"]];
            }
            const allowName = sectionType === "CareerJobs";
            if (allowName && !entries.some(([key]) => key === "name")) {
              entries = [...entries, ["name", "field"]];
            }
            entries = entries.filter(
              ([key]) =>
                key === "label" ||
                key === "type" ||
                key === "placeholder" ||
                (allowName && key === "name"),
            );
            sortObjectEntriesByPreferredOrder(entries, [
              "label",
              "name",
              "type",
              "placeholder",
            ]);
          }

          return entries.map(([childName, childValue]) => (
          <GenericFieldEditor
            key={childName}
            fieldName={childName}
            value={childValue}
            path={[...path, childName]}
            sectionType={sectionType}
            onChange={onChange}
            onMediaChange={onMediaChange}
            onImagePickerRequest={onImagePickerRequest}
            onOpenHrefPicker={onOpenHrefPicker}
            onAddArrayItem={onAddArrayItem}
            onDeleteArrayItem={onDeleteArrayItem}
            availablePageNames={availablePageNames}
          />
          ));
        })()}
      </div>
    );
  }

  const label = formatFieldLabel(fieldName);
  const mediaKind =
    typeof value === "string" ? getMediaKindFromKey(fieldName) : null;

  if (mediaKind) {
    const stringValue = value as string;
    const hasFile = Boolean(stringValue);

    return (
      <div>
        <span className={contentFieldLabelClass}>{label}</span>
        <p className="mt-1 text-[10px] text-slate-500">
          {mediaKind === "image"
            ? "Click Browse to pick an image — preview updates on the right."
            : "Click Browse to upload a video file."}
        </p>
        <div className="mt-2 grid gap-3 sm:grid-cols-[minmax(0,1fr)_9rem] sm:items-start">
          <div className="space-y-2">
            <ContentMediaPickButton
              hasFile={hasFile}
              mediaKind={mediaKind}
              fileLabel={getMediaUploadLabel(stringValue, mediaKind)}
              onClick={() => {
                if (mediaKind === "image") {
                  onImagePickerRequest(path, fieldName, stringValue);
                }
              }}
            >
              {mediaKind === "video" ? (
              <input
                type="file"
                  accept="video/*"
                  onClick={(event) => event.stopPropagation()}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) onMediaChange(path, fieldName, file);
                  event.target.value = "";
                }}
                  className="absolute inset-0 cursor-pointer opacity-0"
                  aria-label={`Upload ${label}`}
              />
              ) : null}
            </ContentMediaPickButton>
          </div>
          <MediaUploadPreview src={stringValue} type={mediaKind} />
        </div>
      </div>
    );
  }

  if (typeof value === "boolean") {
    return (
      <label className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 py-2">
        <span className="text-xs font-semibold text-slate-600">{label}</span>
        <input
          type="checkbox"
          checked={value}
          onChange={(event) => onChange(path, event.target.checked)}
          className="size-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500/30"
        />
      </label>
    );
  }

  const stringValue = value == null ? "" : String(value);
  if (/color$/i.test(fieldName) && typeof value !== "number") {
    const colorValue = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(stringValue)
      ? stringValue
      : fieldName.toLowerCase().includes("background")
        ? "#111827"
        : "#ffffff";
    return (
      <ColorInput
        label={label}
        value={colorValue}
        onChange={(color) => onChange(path, color)}
      />
    );
  }
  if (fieldName === "breadcrumbBackgroundType") {
    return (
      <label className="block">
        <span className={contentFieldLabelClass}>Background type</span>
        <select
          value={stringValue === "color" ? "color" : "image"}
          onChange={(event) => onChange(path, event.target.value)}
          className={contentFieldInputClass}
        >
          <option value="image">Image</option>
          <option value="color">Color</option>
        </select>
      </label>
    );
  }
  if (fieldName === "breadcrumbColorBackgroundType") {
    return (
      <label className="block">
        <span className={contentFieldLabelClass}>Color style</span>
        <select
          value={stringValue === "gradient" ? "gradient" : "solid"}
          onChange={(event) => onChange(path, event.target.value)}
          className={contentFieldInputClass}
        >
          <option value="solid">Solid</option>
          <option value="gradient">Gradient</option>
        </select>
      </label>
    );
  }
  const isRating = sectionType === "Testimonial" && fieldName === "rating";
  const isNumber = typeof value === "number" || isRating;
  const isLongText =
    stringValue.length > 80 ||
    /^(desc|desc2|description|answer|quote|copyrightText)$/i.test(fieldName);
  const isProductLink =
    fieldName === "link" &&
    path.length === 3 &&
    (path[0] === "productItems" || path[0] === "serviceSlides" || path[0] === "productSlides");
  const isButtonVariant = fieldName === "variant";
  const isStatsStyle = fieldName === "statsStyle";
  const isFormFieldType =
    fieldName === "type" && path.length >= 2 && path[0] === "formFields";
  const isFeatureIcon = isFeatureIconPath(path);
  const isWhyChooseUsIcon = isWhyChooseUsIconPath(path);
  const isProcessIcon = isProcessIconPath(path);
  const isMissionValueIcon = isMissionValueIconPath(path);
  const isButtonIcon =
    !isFeatureIcon &&
    !isWhyChooseUsIcon &&
    !isProcessIcon &&
    !isMissionValueIcon &&
    isButtonIconFieldName(fieldName);
  const isButtonIconPosition = isButtonIconPositionFieldName(fieldName);
  const isLinkDestination =
    typeof value === "string" &&
    isLinkDestinationFieldName(fieldName) &&
    Boolean(onOpenHrefPicker);
  const pageExists = availablePageNames.some(
    (pageName) =>
      pageName.trim().toLowerCase() === stringValue.trim().toLowerCase(),
  );

  return (
    <label className="block">
      <span className={contentFieldLabelClass}>{label}</span>
      {isLinkDestination ? (
        <HrefDestinationButton
          value={stringValue}
          onClick={() => onOpenHrefPicker?.(path, stringValue)}
          className="mt-1.5 h-9"
        />
      ) : isButtonVariant ? (
        <select
          value={stringValue || "primary"}
          onChange={(event) => onChange(path, event.target.value)}
          className={contentFieldInputClass}
          aria-label="Button style"
        >
          <option value="primary">Primary</option>
          <option value="secondary">Secondary</option>
        </select>
      ) : isStatsStyle ? (
        <select
          value={stringValue === "light" ? "light" : "dark"}
          onChange={(event) => onChange(path, event.target.value)}
          className={contentFieldInputClass}
          aria-label="Stats style"
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      ) : isFormFieldType ? (
        <select
          value={stringValue || "text"}
          onChange={(event) => onChange(path, event.target.value)}
          className={contentFieldInputClass}
          aria-label="Field type"
        >
          <option value="text">Text</option>
          <option value="email">Email</option>
          <option value="tel">Phone</option>
          <option value="textarea">Textarea</option>
        </select>
      ) : isFeatureIcon ? (
        <select
          value={stringValue || "location"}
          onChange={(event) => onChange(path, event.target.value)}
          className={contentFieldInputClass}
          aria-label="Feature icon"
        >
          {FEATURE_ICON_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : isWhyChooseUsIcon ? (
        <select
          value={stringValue || "star"}
          onChange={(event) => onChange(path, event.target.value)}
          className={contentFieldInputClass}
          aria-label="Why choose us icon"
        >
          {WHY_CHOOSE_ICON_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : isProcessIcon ? (
        <select
          value={
            stringValue ||
            PROCESS_ICON_OPTIONS[
              Number(path[1]) % PROCESS_ICON_OPTIONS.length
            ]?.value ||
            "inspect"
          }
          onChange={(event) => onChange(path, event.target.value)}
          className={contentFieldInputClass}
          aria-label="Process step icon"
        >
          {PROCESS_ICON_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : isMissionValueIcon ? (
        <MissionValueIconPicker
          value={
            stringValue ||
            MISSION_VALUE_ICON_OPTIONS[
              Number(path[1]) % MISSION_VALUE_ICON_OPTIONS.length
            ]?.value ||
            "scale"
          }
          onChange={(next) => onChange(path, next)}
        />
      ) : isButtonIcon ? (
        <select
          value={stringValue || "none"}
          onChange={(event) => onChange(path, event.target.value)}
          className={contentFieldInputClass}
          aria-label="Button icon"
        >
          {BUTTON_ICON_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : isButtonIconPosition ? (
        <select
          value={stringValue || "after"}
          onChange={(event) => onChange(path, event.target.value)}
          className={contentFieldInputClass}
          aria-label="Icon position"
        >
          {BUTTON_ICON_POSITION_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : isLongText ? (
        <textarea
          value={stringValue}
          onChange={(event) => onChange(path, event.target.value)}
          className={contentFieldTextareaClass}
          placeholder={getFriendlyFieldPlaceholder(fieldName, label)}
        />
      ) : (
        <input
          type={isNumber ? "number" : "text"}
          min={isRating ? 0 : undefined}
          max={isRating ? 5 : undefined}
          step={isRating ? 0.5 : undefined}
          value={stringValue}
          onChange={(event) => {
            if (typeof value === "number") {
              onChange(path, Number(event.target.value));
              return;
            }

            if (isRating) {
              onChange(
                path,
                String(
                  Math.max(0, Math.min(5, Number(event.target.value) || 0)),
                ),
              );
              return;
            }

            onChange(path, event.target.value);
          }}
          className={contentFieldInputClass}
          placeholder={getFriendlyFieldPlaceholder(fieldName, label)}
        />
      )}
      {isProductLink && stringValue.trim() && !pageExists && (
        <span className="mt-1 block text-xs font-medium text-red-600">
          No page found.
        </span>
      )}
    </label>
  );
};

const setValueAtPath = (
  source: unknown,
  path: GenericFieldPath,
  value: unknown,
): unknown => {
  if (!path.length) return value;

  const [key, ...remainingPath] = path;

  if (Array.isArray(source)) {
    const copy = [...source];
    const index = Number(key);
    copy[index] = setValueAtPath(copy[index], remainingPath, value);
    return copy;
  }

  const record =
    typeof source === "object" && source !== null
      ? (source as Record<string, unknown>)
      : {};

  return {
    ...record,
    [String(key)]: setValueAtPath(record[String(key)], remainingPath, value),
  };
};

const VisibilityButton = ({ hidden, onClick }: { hidden: boolean; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition ${
      hidden
        ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
    }`}
  >
    {hidden ? "Show" : "Hide"}
  </button>
);

export default function EditSectionModal({
  sectionId,
  sectionType,
  category,
  isSinglePage,
  sections,
  onClose,
  onSave,
  onSelectVariant,
  onUpdateSectionData,
  initialTab,
  contentFields,
  editorTitle,
}: EditSectionModalProps) {
  const [activeTab, setActiveTab] = useState(initialTab ?? getDefaultTab(sectionType));
  const [colorPanelOpen, setColorPanelOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [galleryLayoutStart, setGalleryLayoutStart] = useState(0);
  const [hasChanges, setHasChanges] = useState(false);
  const [lastChangedSection, setLastChangedSection] = useState(sectionType);
  const { currentPage, pageLinks, setCurrentPage, setPageLinks } = usePreview();
  const availablePageNames = getPageNames(pageLinks);
  const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState<{
    pointerId: number;
    pointerX: number;
    pointerY: number;
    modalX: number;
    modalY: number;
  } | null>(null);
  const [bannerGenerationType, setBannerGenerationType] = useState<
    "image" | "video" | null
  >(null);
  const [layoutGenerationActive, setLayoutGenerationActive] = useState(false);
  const [imagePickerTarget, setImagePickerTarget] =
    useState<ImagePickerTarget | null>(null);
  const bannerImageInputRef = useRef<HTMLInputElement>(null);
  const bannerVideoInputRef = useRef<HTMLInputElement>(null);
  const lastMenuItemRef = useRef<HTMLDivElement>(null);
  const newMenuLabelInputRef = useRef<HTMLInputElement>(null);
  const [scrollToNewMenuItem, setScrollToNewMenuItem] = useState(false);
  const activeSectionType = normalizeSectionType(sectionType);
  const visibleSidebarItems = sidebarItemsBySection[activeSectionType] ?? [];
  const currentSection = sections.find(
    (item) => (item.id ?? item.type) === sectionId,
  );
  const activeSectionKey = currentSection?.id ?? currentSection?.type ?? sectionId;
  const isPageSection = Boolean(currentSection?.page);
  const activeVariant = currentSection?.data?.[currentSection.variant]
    ? currentSection.variant
    : currentSection?.variant?.startsWith(`${activeSectionType}-`)
      ? currentSection.variant
      : `${activeSectionType}-1`;
  const isEventsHeader =
    activeVariant === "Header-7" ||
    currentSection?.variant === "Header-7" ||
    activeVariant === "EventsHeader1";
  const eventsEditorPartIndex = editorTitle
    ? (eventsEditorPartLabels[activeVariant]?.indexOf(editorTitle) ?? -1)
    : -1;
  const eventsEditorPart =
    eventsEditorPartIndex >= 0 ? eventsEditorPartIndex : undefined;
  const fallbackVariantData =
    currentSection?.data?.[`${activeSectionType}-1`] ??
    Object.values(currentSection?.data ?? {})[0];

  useEffect(() => {
    if (!currentSection) return;
    if (activeVariant !== "AboutPage-5" && activeVariant !== "AboutPage-6") {
      return;
    }
    const data = (currentSection.data?.[activeVariant] ?? {}) as Record<
      string,
      unknown
    >;
    if (typeof data.desc1 === "string") return;
    const promises = Array.isArray(data.promises)
      ? data.promises.flatMap((item) => {
          if (typeof item === "string" && item.trim()) {
            return [{ title: item }];
          }
          if (
            item &&
            typeof item === "object" &&
            typeof (item as { title?: unknown }).title === "string"
          ) {
            return [{ title: (item as { title: string }).title }];
          }
          return [];
        })
      : [
          { title: "Verified property information" },
          { title: "Clear pricing and local context" },
          { title: "Guided visits with local advisors" },
          { title: "Support from shortlist to closing" },
        ];
    onUpdateSectionData(activeSectionKey, {
      ...currentSection.data,
      [activeVariant]: {
        ...data,
        title:
          (typeof data.title === "string" && data.title) ||
          (typeof data.philosophyTitle === "string"
            ? data.philosophyTitle
            : ""),
        desc1: typeof data.desc2 === "string" ? data.desc2 : "",
        desc2:
          typeof data.philosophyDesc === "string" ? data.philosophyDesc : "",
        promises,
      },
    });
  }, [activeSectionKey, activeVariant, currentSection, onUpdateSectionData]);

  const activeTopbarData = (currentSection?.data?.[activeVariant] ??
    (activeSectionType === "Topbar" ? fallbackVariantData : undefined)) as
    | {
        topbarBackgroundType?: TopbarBackgroundType;
        topbarType?: StickySectionType;
        topbarBackgroundColor?: string;
        topbarGradientColor?: string;
        topbarTextColor?: string;
        text?: string[];
        phone?: string;
        email?: string;
        location?: string;
        socialLinks?: SocialLinkData[];
        hiddenContentFields?: string[];
      }
    | undefined;

  const activeHeaderData = (currentSection?.data?.[activeVariant] ??
    (activeSectionType === "Header" ? fallbackVariantData : undefined)) as
    | {
      logo?: string;
      logoImage?: string;
      logoImageTitle?: string;
      headerBackgroundType?: HeaderBackgroundType;
      headerType?: StickySectionType;
        headerBackgroundColor?: string;
        headerGradientColor?: string;
        headerTextColor?: string;
        headerActiveTextColor?: string;
        headerActiveBackgroundColor?: string;
        headerActiveMenuStyle?:
          | "background"
          | "text-only"
          | "underline"
          | "curved-underline";
        headerActiveKeepTextColor?: boolean;
        headerActiveLineGap?: number;
        headerActiveMenuPadding?: number;
        menu?: MenuItem[];
        button?: { label?: string; href?: string };
        buttons?: ButtonData[];
      }
    | undefined;

  const activeBannerData = (currentSection?.data?.[activeVariant] ??
    (activeSectionType === "Banner"
      ? getDefaultBannerData(activeVariant, fallbackVariantData)
      : undefined)) as
    | {
        backgroundImage?: string;
        backgroundImageTitle?: string;
        pretitle?: string;
        title?: string;
        desc?: string;
        overlayColor?: string;
        titleColor?: string;
        bannerBackgroundMode?: BannerBackgroundMode;
        bannerBackgroundColor?: string;
        bannerGradientColor?: string;
        backgroundVideo?: string;
        bannerHeight?: number;
        bannerSlides?: BannerSlideData[];
        buttons?: ButtonData[];
      }
    | undefined;

  const activeFormDetailData = (currentSection?.data?.[activeVariant] ??
    (activeSectionType === "FormDetail" ? fallbackVariantData : undefined)) as
    | {
        pretitle?: string;
        title?: string;
        desc?: string;
        formSubmitLabel?: string;
        formFields?: FormFieldData[];
      }
    | undefined;
  const activeGenericData = (currentSection?.data?.[activeVariant] ??
    fallbackVariantData) as SectionData | undefined;
  const bannerSlideAccordion = useContentAccordion(
    (activeBannerData?.bannerSlides ?? []).length,
  );
  const bannerButtonAccordion = useContentAccordion(
    (activeBannerData?.buttons ?? []).length,
  );
  const headerButtonAccordion = useContentAccordion(
    (activeHeaderData?.buttons ?? []).length,
  );
  const formFieldAccordion = useContentAccordion(
    (activeFormDetailData?.formFields ?? []).length,
  );
  const editableGenericData =
    activeSectionType === "Breadcrumb"
      ? {
          ...getDefaultBreadcrumbData(activeVariant),
          ...(activeGenericData ?? {}),
        }
      : activeGenericData;
  const activeComponentContentFields =
    componentContentFieldsByVariant[activeVariant];
  const knownSectionContentFields =
    knownContentFieldsBySection[activeSectionType];
  const isContentFieldVisible = (field: string) =>
    !field.startsWith("__") &&
    (!activeComponentContentFields ||
    activeComponentContentFields.includes(field) ||
      !knownSectionContentFields?.has(field));
  const visibleGenericContentEntries = (() => {
    if (contentFields?.length) {
      const data = (editableGenericData ?? {}) as Record<string, unknown>;
      return visibleEventsBreadcrumbFields(contentFields, data).map(
        (field) => [field, data[field] ?? ""] as [string, unknown],
      );
    }
    const entries = Object.entries(editableGenericData ?? {}).filter(
      ([field]) => isContentFieldVisible(field),
    );
    if (activeSectionType === "WhyChooseUs") {
      return sortObjectEntriesByPreferredOrder(entries, [
        "pretitle",
        "title",
        "desc",
        "whyChooseUsItems",
      ]);
    }
    if (activeVariant === "AboutPage-5" || activeVariant === "AboutPage-6") {
      const data = editableGenericData ?? {};
      const promises = Array.isArray(data.promises)
        ? data.promises
        : [
            { title: "Verified property information" },
            { title: "Clear pricing and local context" },
            { title: "Guided visits with local advisors" },
            { title: "Support from shortlist to closing" },
          ];
      const seeded: [string, unknown][] = [
        ["subtitle", data.subtitle ?? ""],
        [
          "title",
          data.title || data.philosophyTitle || "",
        ],
        ["desc1", data.desc1 || data.desc2 || ""],
        [
          "desc2",
          typeof data.desc1 === "string"
            ? data.desc2 || ""
            : data.philosophyDesc || "",
        ],
        ["promises", promises],
        [
          "buttons",
          Array.isArray(data.buttons) && data.buttons.length
            ? data.buttons
            : [
                {
                  label: "Meet our advisors",
                  href: "/contact",
                },
              ],
        ],
        ["sideImage", data.sideImage || ""],
        ["sideImageTitle", data.sideImageTitle || ""],
      ];
      return seeded;
    }
    if (activeSectionType === "FeaturedDev") {
      return sortObjectEntriesByPreferredOrder(entries, [
        "pretitle",
        "title",
        "desc",
        "items",
      ]);
    }
    if (activeSectionType === "InvestmentOpportunities") {
      return sortObjectEntriesByPreferredOrder(entries, [
        "pretitle",
        "title",
        "desc",
        "items",
      ]);
    }
    if (activeSectionType === "Process") {
      return sortObjectEntriesByPreferredOrder(entries, [
        "pretitle",
        "title",
        "desc",
        "steps",
        "button",
      ]);
    }
    if (activeSectionType === "Awards") {
      return sortObjectEntriesByPreferredOrder(entries, [
        "pretitle",
        "title",
        "desc",
        "awardItems",
        "button",
      ]);
    }
    if (activeSectionType === "AwardsPage") {
      const awardsPageEntries = [...entries];
      if (!awardsPageEntries.some(([field]) => field === "contentPretitle")) {
        awardsPageEntries.unshift(["contentPretitle", "Our honours"]);
      }
      if (!awardsPageEntries.some(([field]) => field === "contentTitle")) {
        awardsPageEntries.splice(
          awardsPageEntries.findIndex(([field]) => field === "contentPretitle") + 1,
          0,
          ["contentTitle", "Awards that mark how we work"],
        );
      }
      return sortObjectEntriesByPreferredOrder(awardsPageEntries, [
        "contentPretitle",
        "contentTitle",
        "awardItems",
      ]);
    }
    if (activeSectionType === "MissionPage") {
      return sortObjectEntriesByPreferredOrder(entries, [
        "pillarsPretitle",
        "pillarsTitle",
        "sideImage",
        "sideImageTitle",
        "pillars",
      ]);
    }
    if (activeSectionType === "MissionValues") {
      return sortObjectEntriesByPreferredOrder(entries, [
        "pretitle",
        "title",
        "values",
      ]);
    }
    if (activeSectionType === "CsrPage") {
      return sortObjectEntriesByPreferredOrder(entries, [
        "sideImage",
        "sideImageTitle",
        "impactStats",
      ]);
    }
    if (activeSectionType === "CsrPrograms") {
      return sortObjectEntriesByPreferredOrder(entries, [
        "pretitle",
        "title",
        "programs",
      ]);
    }
    if (activeSectionType === "CareerPage") {
      return sortObjectEntriesByPreferredOrder(entries, ["benefits"]);
    }
    if (activeSectionType === "CareerJobs") {
      return sortObjectEntriesByPreferredOrder(entries, [
        "pretitle",
        "title",
        "jobs",
        "formPretitle",
        "formTitle",
        "formFields",
        "applyLabel",
        "successTitle",
        "successDesc",
        "successButtonLabel",
      ]);
    }
    if (activeSectionType === "ContactPage") {
      return sortObjectEntriesByPreferredOrder(entries, [
        "contactPretitle",
        "contactTitle",
        "footerContact",
        "phoneLabel",
        "emailLabel",
        "officeLabel",
        "formPretitle",
        "formTitle",
        "formFields",
        "consentText",
        "privacyPolicyLabel",
        "formSubmitLabel",
        "successTitle",
        "successMessage",
        "successButtonLabel",
      ]);
    }
    if (activeSectionType === "Breadcrumb") {
      const breadcrumbEntries = [...entries];
      if (
        activeComponentContentFields?.includes("desc") &&
        !breadcrumbEntries.some(([field]) => field === "desc")
      ) {
        breadcrumbEntries.push(["desc", ""]);
      }
      if (
        activeComponentContentFields?.includes("desc2") &&
        !breadcrumbEntries.some(([field]) => field === "desc2")
      ) {
        breadcrumbEntries.push(["desc2", ""]);
      }
      return sortObjectEntriesByPreferredOrder(breadcrumbEntries, [
        "pretitle",
        "title",
        "desc",
        "desc2",
      ]);
    }
    if (activeSectionType === "Stats") {
      const statsEntries = entries.some(([field]) => field === "statsStyle")
        ? entries
        : [...entries, ["statsStyle", "dark"] as [string, unknown]];
      return sortObjectEntriesByPreferredOrder(statsEntries, [
        "stats",
        "statsStyle",
      ]);
    }
    if (activeSectionType === "CTA") {
      const ctaDefaults: Record<string, unknown> = {
        pretitle: "Start your search",
        title: "Let us help you find the right next move.",
        description: "",
        buttons: [
          { label: "Browse properties", href: "/buy-a-property" },
          { label: "Contact us", href: "/contact", secondary: true },
        ],
      };
      const ctaEntries = [...entries];
      Object.entries(ctaDefaults).forEach(([field, fallback]) => {
        if (!ctaEntries.some(([key]) => key === field)) {
          ctaEntries.push([field, fallback]);
        }
      });
      return sortObjectEntriesByPreferredOrder(ctaEntries, [
        "pretitle",
        "title",
        "description",
        "buttons",
      ]);
    }
    if (activeSectionType === "FAQ") {
      const faqEntries =
        activeComponentContentFields?.includes("pretitle") &&
        !entries.some(([field]) => field === "pretitle")
          ? [["pretitle", ""] as [string, unknown], ...entries]
          : entries;
      return sortObjectEntriesByPreferredOrder(faqEntries, [
        "pretitle",
        "title",
        "desc",
        "faqItems",
      ]);
    }
    if (activeSectionType === "Contact") {
      const contactEntries =
        activeComponentContentFields?.includes("pretitle") &&
        !entries.some(([field]) => field === "pretitle")
          ? [["pretitle", ""] as [string, unknown], ...entries]
          : entries;
      return sortObjectEntriesByPreferredOrder(contactEntries, [
        "pretitle",
        "title",
        "desc",
        "backgroundImage",
        "backgroundImageTitle",
        "formFields",
        "formSubmitLabel",
        "successMessage",
      ]);
    }
    if (activeSectionType === "Testimonial") {
      return sortObjectEntriesByPreferredOrder(entries, [
        "pretitle",
        "title",
        "desc",
        "testimonialItems",
      ]);
    }
    return entries;
  })();
  const specializedContentSchema =
    specializedContentFieldSchemas[activeSectionType];
  const automaticContentFields = specializedContentSchema
    ? Object.entries(editableGenericData ?? {})
        .filter(([fieldName]) => isContentFieldVisible(fieldName))
        .flatMap(([fieldName, value]) =>
          collectAutomaticContentFields(
            value,
            specializedContentSchema[fieldName],
            [fieldName],
            fieldName,
          ),
        )
    : [];

  const menuItems = activeHeaderData?.menu ?? [];
  const navSectionOptions = useMemo(() => {
    const options: Array<{ label: string; href: string }> = [];
    const seen = new Set<string>();

    const pushOption = (label: string, href: string) => {
      const key = href.trim().toLowerCase();
      if (!key || seen.has(key)) return;
      seen.add(key);
      options.push({ label, href });
    };

    const homeSections = sections.filter((section) => !section.page);
    homeSections.forEach((section, sectionIndex) => {
      if (
        section.type === "Topbar" ||
        section.type === "Header" ||
        section.type === "Footer"
      ) {
        return;
      }
      const href =
        section.type === "Banner"
          ? "#"
          : `#${getSectionAnchorId(homeSections, sectionIndex)}`;
      const label =
        section.type === "CustomSection"
          ? (() => {
              const data = section.data?.[section.variant] as
                | { sectionName?: string }
                | undefined;
              return data?.sectionName?.trim() || "Custom Section";
            })()
          : formatNavSectionLabel(section.type);
      pushOption(label, href);
    });

    return options;
  }, [sections]);

  const navPageOptions = useMemo(() => {
    const options: Array<{ label: string; href: string }> = [];
    const seen = new Set<string>();

    const pushOption = (label: string, href: string) => {
      const key = safeHref(href).toLowerCase();
      if (!key || seen.has(key)) return;
      seen.add(key);
      options.push({ label, href: safeHref(href) || href });
    };

    // Home is always a page destination (often href "#").
    pushOption("Home", "#");

    // Single-page: Pages tab = Home + Legal/document pages + Blogs only.
    // Properties/About/Contact etc. are sections (or Manage), not pages.
    if (isSinglePage) {
      const appendSinglePageLinks = (links: PageLink[]) => {
        links.forEach((link) => {
          const href = safeHref(link.href).toLowerCase();
          if (link.kind === "document") {
            pushOption(link.label, safeHref(link.href));
          } else if (link.kind === "blogIndex" || href === "#page-blogs") {
            pushOption(link.label || "Blogs", "#page-blogs");
          }
          if (link.children?.length) appendSinglePageLinks(link.children);
        });
      };
      appendSinglePageLinks(pageLinks);
      if (!seen.has("#page-blogs")) {
        pushOption("Blogs", "#page-blogs");
      }
      return options;
    }

    const titleCaseSlug = (value: string) =>
      value
        .replace(/[-_]+/g, " ")
        .trim()
        .replace(/\b\w/g, (char) => char.toUpperCase());

    const pageSlugFromHref = (hrefValue?: string | null) => {
      const href = safeHref(hrefValue).toLowerCase();
      if (!href.startsWith("#page-")) return "";
      return href.slice("#page-".length);
    };

    const isGenericSectionLabel = (label: string) => {
      const key = label.trim().toLowerCase();
      return (
        key === "about" ||
        key === "contact" ||
        key === "gallery" ||
        key === "service" ||
        key === "services"
      );
    };

    const displayLabelForPageLink = (link: PageLink) => {
      const slug = pageSlugFromHref(link.href);
      const raw = (link.label || "").trim();
      if (
        slug &&
        isGenericSectionLabel(raw) &&
        slug !== "about" &&
        slug !== "about-us" &&
        slug !== "contact" &&
        slug !== "contact-us" &&
        slug !== "gallery" &&
        slug !== "service" &&
        slug !== "services"
      ) {
        return titleCaseSlug(slug);
      }
      return raw || titleCaseSlug(slug) || "Page";
    };

    const appendPageLinks = (links: PageLink[]) => {
      links.forEach((link) => {
        if (link.hidden) {
          if (link.children?.length) appendPageLinks(link.children);
          return;
        }
        if (
          link.kind === "blog" ||
          link.kind === "blogIndex" ||
          safeHref(link.href).toLowerCase() === "#page-blogs" ||
          safeHref(link.href).toLowerCase().startsWith("#page-blog-")
        ) {
          if (link.children?.length) appendPageLinks(link.children);
          return;
        }
        const href = safeHref(link.href).toLowerCase();
        // Section-style hashes belong under Sections, not Pages — except Home.
        if (href.startsWith("#") && !href.startsWith("#page-") && href !== "#") {
          if (link.children?.length) appendPageLinks(link.children);
          return;
        }
        if (href === "#") {
          pushOption(link.label || "Home", safeHref(link.href) || "#");
        } else {
          pushOption(displayLabelForPageLink(link), safeHref(link.href));
        }
        if (link.children?.length) appendPageLinks(link.children);
      });
    };
    appendPageLinks(pageLinks);

    // Pages tab = only real entries from pageLinks (Multi Pages / nav).
    // Do NOT invent destinations from section.page leftovers — that showed
    // pages the user never created (orphaned About/Contact scopes, etc.).

    return options;
  }, [isSinglePage, pageLinks]);

  const navBlogOptions = useMemo(() => {
    const options: Array<{ label: string; href: string }> = [
      { label: "Blogs", href: "#page-blogs" },
    ];
    const seen = new Set(["#page-blogs"]);
    pageLinks.forEach((link) => {
      if (link.kind !== "blog") return;
      const key = safeHref(link.href).toLowerCase();
      if (!key || seen.has(key)) return;
      seen.add(key);
      options.push({ label: link.label, href: safeHref(link.href) });
    });
    return options;
  }, [pageLinks]);

  const resolveNavHrefLabel = (href?: string | null) => {
    const key = safeHref(href).toLowerCase();
    if (!key) return "Choose destination";
    if (key === "#") return "Home";
    const match = [
      ...navSectionOptions,
      ...navPageOptions,
      ...navBlogOptions,
    ].find((option) => safeHref(option.href).toLowerCase() === key);
    return match?.label || href || "Choose destination";
  };

  const [hrefPicker, setHrefPicker] = useState<HrefPickerTarget | null>(null);
  const [hrefPickerKind, setHrefPickerKind] =
    useState<NavHrefPickerKind>("sections");
  const [hrefPickerValue, setHrefPickerValue] = useState("");

  const openNavHrefPicker = (menuIndex: number, childIndex?: number) => {
    const currentHref =
      typeof childIndex === "number"
        ? (menuItems[menuIndex]?.children?.[childIndex]?.href ?? "")
        : (menuItems[menuIndex]?.href ?? "");
    setHrefPicker({ source: "nav", menuIndex, childIndex });
    setHrefPickerKind(detectNavHrefPickerKind(currentHref));
    setHrefPickerValue(currentHref);
  };

  const closeHrefPicker = () => {
    setHrefPicker(null);
    setHrefPickerKind("sections");
    setHrefPickerValue("");
  };

  const applyHrefPicker = (hrefOverride?: string) => {
    if (!hrefPicker) return;
    const nextHref = (hrefOverride ?? hrefPickerValue).trim() || "#";

    if (hrefPicker.source === "footer") {
      updateFooterLink(
        hrefPicker.columnIndex,
        hrefPicker.linkIndex,
        "href",
        nextHref,
      );
      closeHrefPicker();
      return;
    }

    if (hrefPicker.source === "generic") {
      updateGenericField(hrefPicker.path, nextHref);
      closeHrefPicker();
      return;
    }

    if (hrefPicker.source === "header-button") {
      updateHeaderButton(hrefPicker.index, "href", nextHref);
      closeHrefPicker();
      return;
    }

    if (hrefPicker.source === "events-header-button") {
      updateEventsHeaderCta("href", nextHref);
      closeHrefPicker();
      return;
    }

    if (hrefPicker.source === "banner-button") {
      updateBannerButton(hrefPicker.index, "href", nextHref);
      closeHrefPicker();
      return;
    }

    if (hrefPicker.source === "banner-slide-button") {
      updateBannerSlideButton(
        hrefPicker.slideIndex,
        hrefPicker.buttonIndex,
        "href",
        nextHref,
      );
      closeHrefPicker();
      return;
    }

    if (typeof hrefPicker.childIndex === "number") {
      updateDropdownItem(
        hrefPicker.menuIndex,
        hrefPicker.childIndex,
        "href",
        nextHref,
      );
    } else {
      updateMenuItem(hrefPicker.menuIndex, "href", nextHref);
    }
    closeHrefPicker();
  };
  const topbarBackgroundType =
    activeTopbarData?.topbarBackgroundType ?? "solid";
  const topbarType = activeTopbarData?.topbarType ?? "scroll";
  const topbarLayoutSkin = TOPBAR_LAYOUT_SKINS[activeVariant];
  const topbarSolidColor =
    activeTopbarData?.topbarBackgroundColor ??
    topbarLayoutSkin?.topbarBackgroundColor ??
    "#245c6e";
  const topbarGradientColor =
    activeTopbarData?.topbarGradientColor ?? "#0668ff";
  const topbarTextColor =
    activeTopbarData?.topbarTextColor ??
    topbarLayoutSkin?.topbarTextColor ??
    "#ffffff";
  const topbarPreviewBackground =
    topbarBackgroundType === "gradient"
      ? `linear-gradient(90deg, ${topbarSolidColor}, ${topbarGradientColor})`
      : topbarSolidColor;
  const headerBackgroundType =
    activeHeaderData?.headerBackgroundType ?? "solid";
  const headerType = activeHeaderData?.headerType ?? "scroll";
  const headerSolidColor = activeHeaderData?.headerBackgroundColor ?? "#245c6e";
  const headerGradientColor =
    activeHeaderData?.headerGradientColor ?? "#0668ff";
  const headerTextColor = activeHeaderData?.headerTextColor ?? "#ffffff";
  const headerActiveTextColor =
    activeHeaderData?.headerActiveTextColor ?? "#ffffff";
  const headerActiveBackgroundColor =
    activeHeaderData?.headerActiveBackgroundColor ?? "#2563eb";
  const headerActiveMenuStyle =
    activeHeaderData?.headerActiveMenuStyle ?? "background";
  const headerActiveKeepTextColor =
    activeHeaderData?.headerActiveKeepTextColor ?? false;
  const headerActiveLineGap =
    activeHeaderData?.headerActiveLineGap ?? DEFAULT_ACTIVE_MENU_LINE_GAP;
  const headerActiveMenuPadding =
    activeHeaderData?.headerActiveMenuPadding ?? DEFAULT_ACTIVE_MENU_PADDING;
  const headerPreviewBackground =
    headerBackgroundType === "gradient"
      ? `linear-gradient(90deg, ${headerSolidColor}, ${headerGradientColor})`
      : headerSolidColor;
  const explicitBannerBackgroundMode = activeBannerData?.bannerBackgroundMode;
  const bannerBackgroundMode = explicitBannerBackgroundMode ?? "image";
  const bannerSolidColor = activeBannerData?.bannerBackgroundColor ?? "#0f172a";
  const bannerGradientColor =
    activeBannerData?.bannerGradientColor ?? "#0ea5e9";
  const bannerHeight = activeBannerData?.bannerHeight ?? 70;
  const hasBannerImageField = bannerBackgroundMode === "image";
  const hasBannerVideoField = bannerBackgroundMode === "video";
  const hasBannerColorField =
    bannerBackgroundMode === "solid" || bannerBackgroundMode === "gradient";
  const hasBannerButtonsField = "buttons" in (activeBannerData ?? {});
  const hasBannerMediaField =
    hasBannerImageField || hasBannerVideoField || hasBannerColorField;
  const hasBannerHeightField = "bannerHeight" in (activeBannerData ?? {});
  const hasBannerSlidesField = Array.isArray(activeBannerData?.bannerSlides);
  const isSliderBanner =
    activeVariant === "Banner-3" ||
    activeVariant === "Banner-4" ||
    activeVariant === "Banner-5" ||
    activeVariant === "Banner-6";
  const isVideoSliderBanner = activeVariant === "Banner-4";
  const isSimpleBanner =
    activeVariant === "Banner-1" ||
    activeVariant === "Banner-2";

  const activeFooterData = (currentSection?.data?.[activeVariant] ??
    (activeSectionType === "Footer" ? fallbackVariantData : undefined)) as
    | {
        logo?: string;
        logoImage?: string;
        logoImageTitle?: string;
        footerColumns?: {
          title: string;
          hidden?: boolean;
          links: { label: string; href: string; hidden?: boolean }[];
        }[];
        footerBackgroundType?: FooterBackgroundType;
        footerBackgroundColor?: string;
        footerGradientColor?: string;
        footerTextColor?: string;
        whatsappLink?: string;
        callLink?: string;
        floatingItems?: FloatingItemData[];
      }
    | undefined;
  const footerBackgroundType =
    activeFooterData?.footerBackgroundType ?? "solid";
  const footerSolidColor = activeFooterData?.footerBackgroundColor ?? "#0d1f2a";
  const footerGradientColor =
    activeFooterData?.footerGradientColor ?? "#1d4ed8";
  const footerTextColor = activeFooterData?.footerTextColor ?? "#ffffff";
  const footerPreviewBackground =
    footerBackgroundType === "gradient"
      ? `linear-gradient(90deg, ${footerSolidColor}, ${footerGradientColor})`
      : footerSolidColor;
  const topbarSocialLinks = getVisibleSocialLinks(
    activeTopbarData?.socialLinks,
  );
  const usesSectionColorPanel =
    (activeSectionType === "Topbar" && activeTab === "Topbar Settings") ||
    (activeSectionType === "Header" && activeTab === "Header Settings") ||
    (activeSectionType === "Footer" && activeTab === "Footer Settings");
  const sectionLayoutOptions: LayoutOption[] =
    layoutsBySection[activeSectionType] ?? [];
  const pageLayoutOptions: LayoutOption[] =
    pageLayoutsBySection[activeSectionType] ?? [];
  const fallbackLayoutOptions: LayoutOption[] = isPageSection
    ? [...sectionLayoutOptions, ...pageLayoutOptions]
    : sectionLayoutOptions;
  const databaseSectionTypes = isPageSection
    ? [activeSectionType, `${activeSectionType}Page`]
    : activeSectionType;
  const databaseLayoutOptions: LayoutOption[] = getSectionLayoutsForCategory(
    category,
    databaseSectionTypes,
    isPageSection ? "page" : "home",
  ).map((layout) => ({
    id: layout.key,
    name: layout.name,
    isDatabase: true,
    thumbnailUrl: layout.thumbnailUrl,
  }));
  const unorderedLayoutOptions: LayoutOption[] = databaseLayoutOptions.length
    ? databaseLayoutOptions
    : fallbackLayoutOptions;
  const activeLayoutId = currentSection?.variant;
  const layoutOptions: LayoutOption[] = [...unorderedLayoutOptions].sort(
    (left, right) => {
      if (left.id === activeLayoutId) return -1;
      if (right.id === activeLayoutId) return 1;
      return 0;
    },
  );
  const visibleLayoutOptions =
    activeSectionType === "Gallery" && layoutOptions.length > 4
      ? Array.from(
          { length: 4 },
          (_, index) =>
            layoutOptions[(galleryLayoutStart + index) % layoutOptions.length],
        )
      : layoutOptions;
  const activeAboutLayouts: LayoutOption[] =
    activeSectionType === "About" ? layoutOptions : aboutLayouts;
  const generationText = bannerGenerationType
    ? `generating ${bannerGenerationType}`
    : layoutGenerationActive
      ? "generating layout"
      : "";

  const handleModalPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;

    const target = event.target as HTMLElement;
    const interactiveLabel = target.closest("label")?.querySelector("input");

    if (
      interactiveLabel ||
      target.closest(
        "button,input,textarea,select,a,[role='button'],[data-editor-no-drag]",
      )
    ) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();

    setDragStart({
      pointerId: event.pointerId,
      pointerX: event.clientX,
      pointerY: event.clientY,
      modalX: modalPosition.x,
      modalY: modalPosition.y,
    });
  };

  const handleModalPointerUp = () => {
    setDragStart(null);
  };

  useEffect(() => {
    if (!dragStart) return;

    const handleWindowPointerMove = (event: globalThis.PointerEvent) => {
      if (event.pointerId !== dragStart.pointerId) return;

      setModalPosition({
        x: Math.max(
          -320,
          Math.min(320, dragStart.modalX + event.clientX - dragStart.pointerX),
        ),
        y: Math.max(
          -120,
          Math.min(220, dragStart.modalY + event.clientY - dragStart.pointerY),
        ),
      });
    };
    const handleWindowPointerEnd = (event: globalThis.PointerEvent) => {
      if (event.pointerId === dragStart.pointerId) setDragStart(null);
    };

    window.addEventListener("pointermove", handleWindowPointerMove);
    window.addEventListener("pointerup", handleWindowPointerEnd);
    window.addEventListener("pointercancel", handleWindowPointerEnd);

    return () => {
      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("pointerup", handleWindowPointerEnd);
      window.removeEventListener("pointercancel", handleWindowPointerEnd);
    };
  }, [dragStart]);

  const updateActiveTopbarData = (newData: Record<string, unknown>) => {
    if (!currentSection) return;

    const baseTopbarData =
      (currentSection.data?.[activeVariant] as
        | Record<string, unknown>
        | undefined) ??
      (fallbackVariantData as Record<string, unknown> | undefined) ??
      {};

    setHasChanges(true);
    setLastChangedSection(activeSectionKey);
    onUpdateSectionData(activeSectionKey, {
      ...currentSection.data,
      [activeVariant]: {
        ...baseTopbarData,
        ...newData,
      },
    });
  };

  const updateActiveHeaderData = (
    newData: Record<string, unknown>,
    options?: { syncPageLinks?: boolean },
  ) => {
    if (!currentSection) return;

    const syncPageLinks = options?.syncPageLinks !== false;

    const baseHeaderData =
      (currentSection.data?.[activeVariant] as
        | Record<string, unknown>
        | undefined) ??
      (fallbackVariantData as Record<string, unknown> | undefined) ??
      {};

    if (Array.isArray(newData.menu) && syncPageLinks) {
      const templateId = (() => {
        try {
          return new URLSearchParams(window.location.search).get("templateId");
        } catch {
          return null;
        }
      })();
      const menuForSync = canonicalizePortfolioNavMenu(
        newData.menu as MenuItem[],
        templateId,
        category,
      );
      // Persist canonical Projects href back into the header menu too.
      newData = { ...newData, menu: menuForSync };

      const prevByHref = new Map(
        pageLinks.flatMap((link) => {
          const entries: Array<[string, PageLink]> = [];
          const walk = (item: PageLink) => {
            const key = safeHref(item.href).toLowerCase();
            if (key) entries.push([key, item]);
            item.children?.forEach(walk);
          };
          walk(link);
          return entries;
        }),
      );
      const nextNavigationLinks = filterPendingNavLinks(
        toPageLinks(menuForSync).map((link) => {
          const hrefKey = safeHref(link.href).toLowerCase();
          const prev = prevByHref.get(hrefKey);
          const withKind =
            hrefKey === "#page-blogs"
              ? { ...link, kind: "blogIndex" as const }
              : link;
          if (!prev) return withKind;
          return {
            ...withKind,
            ...(typeof prev.hidden === "boolean" ? { hidden: prev.hidden } : {}),
            ...(prev.kind && !withKind.kind ? { kind: prev.kind } : {}),
          };
        }),
      );
      try {
        const templateId = new URLSearchParams(window.location.search).get(
          "templateId",
        );
        if (templateId) {
          const previous = readOnboardingNavSnapshot();
          saveOnboardingNavSnapshot({
            templateId,
            menu: nextNavigationLinks,
            footerColumns: previous?.footerColumns || [],
          });
        }
      } catch {
        /* ignore */
      }
      const blogRecords = pageLinks.filter((link) => link.kind === "blog");
      const documentRecords = pageLinks.filter(
        (link) => link.kind === "document",
      );

      if (isSinglePage) {
        // Single-page: menu ↔ sections stay coupled via pageLinks.
        const nextPageLinks = [
          ...nextNavigationLinks,
          ...documentRecords,
          ...blogRecords,
        ];
      setPageLinks(nextPageLinks);
      setCurrentPage(
        nextPageLinks.some((item) => item.label === currentPage)
          ? currentPage
            : (nextNavigationLinks[0]?.label ?? currentPage),
        );
      } else {
        // Multi-page: removing a nav item must not remove the page inventory.
        const collectHrefs = (links: PageLink[]): string[] =>
          links.flatMap((link) => [
            safeHref(link.href).toLowerCase(),
            ...(link.children ? collectHrefs(link.children) : []),
          ]);
        const navHrefs = new Set(collectHrefs(nextNavigationLinks));
        const flattenLinks = (links: PageLink[]): PageLink[] =>
          links.flatMap((link) => [
            link,
            ...(link.children ? flattenLinks(link.children) : []),
          ]);

        const orphans = flattenLinks(pageLinks)
          .filter((link) => {
            if (link.kind === "blog" || link.kind === "document") return false;
            const href = safeHref(link.href).toLowerCase();
            if (!href || navHrefs.has(href)) return false;
            return (
              href === "#" ||
              href.startsWith("#page-") ||
              link.kind === "blogIndex" ||
              link.kind === "page"
            );
          })
          .map((link) => ({ ...link, children: undefined }));

        const nextPageLinks = [
          ...nextNavigationLinks,
          ...orphans,
          ...documentRecords,
          ...blogRecords,
        ];
        setPageLinks(nextPageLinks);
        const labels = getPageNames(nextPageLinks);
        if (!labels.includes(currentPage)) {
          setCurrentPage(labels[0] ?? currentPage);
        }
      }
    }

    setHasChanges(true);
    setLastChangedSection(activeSectionKey);
    onUpdateSectionData(activeSectionKey, {
      ...currentSection.data,
      [activeVariant]: {
        ...baseHeaderData,
        ...newData,
      },
    });
  };

  const updateActiveBannerData = (newData: Record<string, unknown>) => {
    if (!currentSection || !activeBannerData) return;

    setHasChanges(true);
    setLastChangedSection(activeSectionKey);
    onUpdateSectionData(activeSectionKey, {
      ...currentSection.data,
      [activeVariant]: {
        ...activeBannerData,
        ...newData,
      },
    });
  };

  const updateActiveFooterData = (newData: Record<string, unknown>) => {
    if (!currentSection) return;

    const baseFooterData =
      (currentSection.data?.[activeVariant] as
        | Record<string, unknown>
        | undefined) ??
      (fallbackVariantData as Record<string, unknown> | undefined) ??
      {};

    if (Array.isArray(newData.footerColumns)) {
      try {
        const templateId = new URLSearchParams(window.location.search).get(
          "templateId",
        );
        const previous = readOnboardingNavSnapshot();
        if (templateId && previous?.menu?.length) {
          saveOnboardingNavSnapshot({
            templateId,
            menu: previous.menu,
            footerColumns: newData.footerColumns as {
              title: string;
              links: { label: string; href: string }[];
            }[],
          });
        }
      } catch {
        /* ignore */
      }
    }

    setHasChanges(true);
    setLastChangedSection(activeSectionKey);
    onUpdateSectionData(activeSectionKey, {
      ...currentSection.data,
      [activeVariant]: {
        ...baseFooterData,
        ...newData,
      },
    });
  };

  const updateActiveFormDetailData = (newData: Record<string, unknown>) => {
    if (!currentSection) return;

    const baseFormDetailData =
      (currentSection.data?.[activeVariant] as
        | Record<string, unknown>
        | undefined) ??
      (fallbackVariantData as Record<string, unknown> | undefined) ??
      {};

    setHasChanges(true);
    setLastChangedSection(activeSectionKey);
    onUpdateSectionData(activeSectionKey, {
      ...currentSection.data,
      [activeVariant]: {
        ...baseFormDetailData,
        ...newData,
      },
    });
  };

  const updateFormField = (
    index: number,
    field: keyof FormFieldData,
    value: string,
  ) => {
    const updatedFields = (activeFormDetailData?.formFields ?? []).map(
      (item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
    );

    updateActiveFormDetailData({ formFields: updatedFields });
  };

  const addFormField = () => {
    if ((activeFormDetailData?.formFields ?? []).length >= MAX_FORM_FIELDS) {
      return;
    }

    updateActiveFormDetailData({
      formFields: [
        ...(activeFormDetailData?.formFields ?? []),
        {
          label: "New Field",
          type: "text",
          placeholder: "Enter value",
        },
      ],
    });
  };

  const deleteFormField = (index: number) => {
    updateActiveFormDetailData({
      formFields: (activeFormDetailData?.formFields ?? []).filter(
        (_, itemIndex) => itemIndex !== index,
      ),
    });
  };

  const updateActiveGenericData = (newData: Record<string, unknown>) => {
    if (!currentSection) return;

    const baseGenericData =
      (currentSection.data?.[activeVariant] as
        | Record<string, unknown>
        | undefined) ??
      (fallbackVariantData as Record<string, unknown> | undefined) ??
      {};

    setHasChanges(true);
    setLastChangedSection(activeSectionKey);
    onUpdateSectionData(activeSectionKey, {
      ...currentSection.data,
      [activeVariant]: {
        ...baseGenericData,
        ...newData,
      },
    });
  };

  const updateGenericField = (path: GenericFieldPath, value: unknown) => {
    const [field, ...nestedPath] = path;
    if (typeof field !== "string") return;

    const baseGenericData =
      (currentSection?.data?.[activeVariant] as SectionData | undefined) ??
      (fallbackVariantData as SectionData | undefined);
    if (!baseGenericData) return;

    const nextValue = setValueAtPath(
      baseGenericData[field as keyof SectionData],
      nestedPath,
      value,
    );

    if (
      activeSectionType === "Header" &&
      field === "menu" &&
      Array.isArray(nextValue)
    ) {
      updateActiveHeaderData({ menu: nextValue });
      return;
    }

    updateActiveGenericData({
      [field]: nextValue,
    });
  };

  const openImagePicker = (
    title: string,
    currentValue: string,
    apply: (source: string, fileName: string) => void,
  ) => {
    setImagePickerTarget({ title, currentValue, apply });
  };

  const openGenericImagePicker = (
    path: GenericFieldPath,
    fieldName: string,
    currentValue: string,
  ) => {
    openImagePicker(formatFieldLabel(fieldName), currentValue, (source) => {
      updateGenericField(path, source);
    });
  };

  const updateGenericMedia = (
    path: GenericFieldPath,
    fieldName: string,
    file: File,
  ) => {
    const mediaKind = getMediaKindFromKey(fieldName) ?? "image";

    showBannerGenerationLoader(mediaKind);
    readBannerBackgroundFile(file, (dataUrl) => {
      updateGenericField(path, dataUrl);
    });
  };

  const addGenericCollectionItem = (path: GenericFieldPath) => {
    const [field] = path;
    if (typeof field !== "string") return;

    const items = activeGenericData?.[field as keyof SectionData];
    if (!Array.isArray(items)) return;
    if (field === "features" && items.length >= 4) return;
    if (field === "whyChooseUsItems" && items.length >= 4) return;
    if (field === "steps" && items.length >= 4) return;
    if (field === "awardItems" && activeSectionType === "Awards" && items.length >= 5) return;
    if (field === "stats" && items.length >= 4) return;
    if (field === "impactStats" && items.length >= 4) return;
    if (field === "benefits" && items.length >= 4) return;
    if (field === "formFields" && items.length >= MAX_FORM_FIELDS) return;
    if (field === "items" && activeSectionType !== "FeaturedDev" && activeSectionType !== "InvestmentOpportunities") return;

    const newItems: Record<string, unknown> = {
      productItems: {
        title: "New Product",
        category: "Product Category",
        desc: "Add the product description here.",
        image: "",
        alt: "Product image",
        link: "",
      },
      serviceSlides: {
        image: "",
        alt: "Service image",
        link: "",
        productTitle: "New Service",
        productSubtitle: "Service Category",
        productInfoTitle: "Service Details",
        productInfoDesc: "Add the service description here.",
        productFeatures: [
          { label: "Feature", price: "Price" },
        ],
        productTotalPrice: "Price",
        productShippingText: "Add delivery information",
        button: {
          label: "View details",
          href: "#",
          variant: "primary",
        },
      },
      testimonialItems: {
        name: "New Customer",
        role: "Customer",
        quote: "Add the customer testimonial here.",
        image: "",
        rating: "5",
      },
      faqItems: {
        question: "New question",
        answer: "Add the answer here.",
      },
      galleryItems: {
        image: "",
        alt: "Gallery image",
        title: "New gallery image",
      },
      features: {
        title: "New feature",
        desc: "Add a short description.",
        icon: "location",
        image: "",
      },
      whyChooseUsItems: {
        icon: "star",
        title: "New reason",
        desc: "Add a short description.",
        stat: "",
        image: "",
      },
      items:
        activeSectionType === "InvestmentOpportunities"
          ? {
              title: "New opportunity",
              desc: "Add a short description.",
              image: "",
              alt: "Property image",
              yieldLabel: "",
              href: "/contact",
            }
          : {
              name: "New developer",
              image: "",
              alt: "Developer logo",
            },
      steps: {
        step: String(items.length + 1).padStart(2, "0"),
        icon: "inspect",
        title: "New step",
        desc: "Add a short description.",
      },
      awardItems: {
        year: String(new Date().getFullYear()),
        title: "New award",
        org: "Organization",
        desc: "Add a short description.",
        image: "",
        alt: "Award badge",
      },
      pillars: {
        title: "New promise",
        desc: "Add a short description.",
      },
      values: {
        icon: "scale",
        title: "New principle",
        desc: "Add a short description.",
      },
      impactStats: {
        stat: "0+",
        label: "New impact",
      },
      programs: {
        image: "",
        amount: "",
        title: "New program",
        desc: "Add a short description.",
      },
      benefits: {
        title: "New benefit",
        desc: "Add a short description.",
      },
      jobs: {
        title: "New role",
        location: "Location",
        type: "Full-time",
        desc: "Add a short description.",
      },
      stats: {
        stat: "0+",
        label: "New stat",
      },
      promises: {
        title: "New point",
      },
      formFields:
        activeSectionType === "CareerJobs"
          ? {
              label: "New Field",
              name: "field",
              type: "text",
              placeholder: "Enter value",
            }
          : {
              label: "New Field",
              type: "text",
              placeholder: "Enter value",
      },
    };
    const newItem = newItems[field];

    if (!newItem) return;
    updateGenericField(path, [...items, newItem]);
  };

  const deleteGenericCollectionItem = (
    path: GenericFieldPath,
    index: number,
  ) => {
    const [field] = path;
    if (typeof field !== "string") return;

    const items = activeGenericData?.[field as keyof SectionData];
    if (!Array.isArray(items)) return;

    updateGenericField(
      path,
      items.filter((_, itemIndex) => itemIndex !== index),
    );
  };

  const handleSidebarTabChange = (tab: string) => {
    setActiveTab(tab);
    setMobileSidebarOpen(false);
  };

  const selectSectionVariant = (variant: string) => {
    const isAllowedVariant =
      variant.startsWith(`${activeSectionType}-`) ||
      (isPageSection && variant.startsWith(`${activeSectionType}Page-`));

    if (!isAllowedVariant) return;

    setLayoutGenerationActive(true);
    window.setTimeout(() => {
      setLayoutGenerationActive(false);
      onClose();
    }, 1600);

    if (activeSectionType === "Banner" && currentSection) {
      const currentVariantData = currentSection.data[variant];
      const sourceVariantData =
        currentVariantData ??
        currentSection.data[activeVariant] ??
        currentSection.data["Banner-1"] ??
        Object.values(currentSection.data)[0];
      const nextVariantData =
        variant === "Banner-1"
          ? {
              ...sourceVariantData,
              bannerBackgroundMode: "image" as const,
              backgroundImage: sourceVariantData?.backgroundImage ?? "/bg1.jpg",
            }
          : variant === "Banner-2"
            ? {
                ...sourceVariantData,
                bannerBackgroundMode: "video" as const,
                backgroundVideo:
                  sourceVariantData?.backgroundVideo ?? "/video.mp4",
              }
            : undefined;

      if (nextVariantData) {
        onUpdateSectionData(activeSectionKey, {
          ...currentSection.data,
          [variant]: nextVariantData,
        });
      }
    }

    if (
      activeSectionType === "Banner" &&
      currentSection &&
      !currentSection.data[variant]
    ) {
      const defaultBannerData = getDefaultBannerData(
        variant,
        currentSection.data[activeVariant] ??
          currentSection.data["Banner-1"] ??
          Object.values(currentSection.data)[0],
      );

      if (defaultBannerData) {
        onUpdateSectionData(activeSectionKey, {
          ...currentSection.data,
          [variant]: defaultBannerData,
        });
      }
    }

    if (currentSection?.variant !== variant) {
      if (currentSection && !currentSection.data[variant]) {
        const sourceData =
          currentSection.data[activeVariant] ?? Object.values(currentSection.data)[0];

        onUpdateSectionData(activeSectionKey, {
          ...currentSection.data,
          [variant]: withTopbarLayoutSkin(
            variant,
            (sourceData || {}) as Record<string, unknown>,
          ) as SectionData,
        });
      } else if (
        currentSection &&
        TOPBAR_LAYOUT_SKINS[variant] &&
        currentSection.data[variant]
      ) {
        onUpdateSectionData(activeSectionKey, {
          ...currentSection.data,
          [variant]: withTopbarLayoutSkin(
            variant,
            currentSection.data[variant] as Record<string, unknown>,
          ) as SectionData,
        });
      }

      setHasChanges(true);
      setLastChangedSection(activeSectionKey);
    }

    onSelectVariant(activeSectionKey, variant);
  };

  const handleDone = () => {
    if (hasChanges) {
      if (menuItems.length) {
        // Flush label-only edits into pageLinks before save/close.
        updateActiveHeaderData({ menu: menuItems }, { syncPageLinks: true });
      }
      onSave(lastChangedSection);
      return;
    }

    onClose();
  };
  const updateMenuItem = (
    index: number,
    field: keyof MenuItem,
    value: string,
  ) => {
    const nextValue = field === "label" ? limitLinkText(value) : value;
    const updatedMenu = menuItems.map((item, itemIndex) =>
      itemIndex === index ? { ...item, [field]: nextValue } : item,
    );

    // Label typing must not rewrite pageLinks every keystroke — that remounted
    // the editor and opened a blank modal. Sync inventory on blur / href change.
    updateActiveHeaderData(
      { menu: updatedMenu },
      { syncPageLinks: field !== "label" },
    );
  };

  const syncNavMenuPageLinks = () => {
    updateActiveHeaderData({ menu: menuItems }, { syncPageLinks: true });
  };

  const addMenuItem = () => {
    if (menuItems.length >= MAX_MENU_LINKS) return;

    const updatedMenu = [
      ...menuItems,
      {
        label: "New Item",
        href: "",
      },
    ];

    setScrollToNewMenuItem(true);
    updateActiveHeaderData({ menu: updatedMenu }, { syncPageLinks: false });
  };

  const updateTopbarBackgroundType = (type: TopbarBackgroundType) => {
    updateActiveTopbarData({ topbarBackgroundType: type });
  };

  const updateTopbarType = (type: StickySectionType) => {
    updateActiveTopbarData({ topbarType: type });
  };

  const updateTopbarSolidColor = (color: string) => {
    updateActiveTopbarData({ topbarBackgroundColor: color });
  };

  const updateTopbarGradientColor = (color: string) => {
    updateActiveTopbarData({ topbarGradientColor: color });
  };

  const updateTopbarTextColor = (color: string) => {
    updateActiveTopbarData({ topbarTextColor: color });
  };

  const updateTopbarText = (value: string) => {
    updateActiveTopbarData({ text: [value] });
  };

  const isTopbarFieldHidden = (field: string) =>
    activeTopbarData?.hiddenContentFields?.includes(field) ?? false;

  const toggleTopbarFieldVisibility = (field: string) => {
    const hiddenFields = activeTopbarData?.hiddenContentFields ?? [];
    updateActiveTopbarData({
      hiddenContentFields: hiddenFields.includes(field)
        ? hiddenFields.filter((item) => item !== field)
        : [...hiddenFields, field],
    });
  };

  const updateTopbarField = (
    field: "phone" | "email" | "location",
    value: string,
  ) => {
    updateActiveTopbarData({ [field]: value });
  };

  const updateTopbarSocialLink = (
    index: number,
    field: "label" | "href",
    value: string,
  ) => {
    const updatedSocialLinks = topbarSocialLinks.map(
      (socialLink, socialIndex) =>
        socialIndex === index
          ? field === "label"
            ? {
                ...socialLink,
                label: value as SocialLinkData["label"],
              }
            : {
                ...socialLink,
                href: value,
              }
          : socialLink,
    );

    updateActiveTopbarData({
      socialLinks: getVisibleSocialLinks(updatedSocialLinks),
    });
  };

  const addTopbarSocialLink = () => {
    const currentSocialLinks = getVisibleSocialLinks(
      activeTopbarData?.socialLinks,
    );

    if (currentSocialLinks.length >= MAX_TOPBAR_SOCIAL_LINKS) {
      return;
    }

    const updatedSocialLinks = [
      ...currentSocialLinks,
      { label: "instagram" as const, href: "https://" },
    ];

    updateActiveTopbarData({ socialLinks: updatedSocialLinks });
  };

  const deleteTopbarSocialLink = (index: number) => {
    const updatedSocialLinks = topbarSocialLinks.filter(
      (_, socialIndex) => socialIndex !== index,
    );

    updateActiveTopbarData({ socialLinks: updatedSocialLinks });
  };

  const updateHeaderBackgroundType = (type: HeaderBackgroundType) => {
    updateActiveHeaderData({ headerBackgroundType: type });
  };

  const updateHeaderType = (type: StickySectionType) => {
    updateActiveHeaderData({ headerType: type });
  };

  const updateHeaderSolidColor = (color: string) => {
    updateActiveHeaderData({ headerBackgroundColor: color });
  };

  const updateHeaderGradientColor = (color: string) => {
    updateActiveHeaderData({ headerGradientColor: color });
  };

  const updateHeaderTextColor = (color: string) => {
    updateActiveHeaderData({ headerTextColor: color });
  };

  const updateHeaderActiveTextColor = (color: string) => {
    updateActiveHeaderData({ headerActiveTextColor: color });
  };

  const updateHeaderActiveBackgroundColor = (color: string) => {
    updateActiveHeaderData({ headerActiveBackgroundColor: color });
  };

  const updateHeaderActiveMenuStyle = (style: HeaderActiveMenuStyle) => {
    updateActiveHeaderData({
      headerActiveMenuStyle: style,
      ...(style === "text-only" ? { headerActiveKeepTextColor: false } : {}),
    });
  };

  const updateHeaderActiveKeepTextColor = (keep: boolean) => {
    updateActiveHeaderData({ headerActiveKeepTextColor: keep });
  };

  const updateHeaderActiveLineGap = (gap: number) => {
    updateActiveHeaderData({ headerActiveLineGap: gap });
  };

  const updateHeaderActiveMenuPadding = (padding: number) => {
    updateActiveHeaderData({ headerActiveMenuPadding: padding });
  };

  const updateHeaderLogo = (logo: string) => {
    updateActiveHeaderData({ logo });
  };

  const updateHeaderLogoImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    showBannerGenerationLoader("image");
    readBannerBackgroundFile(file, (dataUrl) => {
      updateActiveHeaderData({
        logoImage: dataUrl,
        logoImageTitle: file.name,
      });
    });
    event.target.value = "";
  };

  const deleteHeaderLogoImage = () => {
    updateActiveHeaderData({ logoImage: "", logoImageTitle: "" });
  };

  const updateHeaderButton = (
    index: number,
    field: keyof ButtonData,
    value: string | boolean,
  ) => {
    const nextValue = field === "label" && typeof value === "string" ? limitLinkText(value) : value;
    const updatedButtons = (activeHeaderData?.buttons ?? []).map(
      (button, buttonIndex) =>
        buttonIndex === index ? { ...button, [field]: nextValue } : button,
    );

    updateActiveHeaderData({ buttons: updatedButtons });
  };

  const addHeaderButton = () => {
    if ((activeHeaderData?.buttons ?? []).length >= MAX_HEADER_BUTTONS) return;

    const updatedButtons = [
      ...(activeHeaderData?.buttons ?? []),
      { label: "New Button", href: "#", variant: "primary", icon: "none", iconPosition: "after", openInNewTab: false },
    ];

    updateActiveHeaderData({ buttons: updatedButtons });
  };

  const deleteHeaderButton = (index: number) => {
    const updatedButtons = (activeHeaderData?.buttons ?? []).filter(
      (_, buttonIndex) => buttonIndex !== index,
    );

    updateActiveHeaderData({ buttons: updatedButtons });
  };

  const updateEventsHeaderCta = (field: "label" | "href", value: string) => {
    const nextValue = field === "label" ? limitLinkText(value) : value;
    const currentButton =
      activeHeaderData?.button &&
      typeof activeHeaderData.button === "object" &&
      !Array.isArray(activeHeaderData.button)
        ? activeHeaderData.button
        : { label: "", href: "/contact" };

    updateActiveHeaderData({
      button: {
        ...currentButton,
        [field]: nextValue,
      },
    });
  };

  const updateBannerField = (field: string, value: string) => {
    updateActiveBannerData({ [field]: value });
  };

  const readBannerBackgroundFile = (
    file: File,
    onLoad: (dataUrl: string) => void,
  ) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        onLoad(reader.result);
      }
    };

    reader.readAsDataURL(file);
  };

  const showBannerGenerationLoader = (type: "image" | "video") => {
    setBannerGenerationType(type);
    window.setTimeout(() => {
      setBannerGenerationType(null);
      onClose();
    }, 1800);
  };

  const handleBannerImageFileChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    showBannerGenerationLoader("image");
    readBannerBackgroundFile(file, (dataUrl) => {
      updateActiveBannerData({
        bannerBackgroundMode: "image",
        backgroundImage: dataUrl,
        backgroundImageTitle:
          activeBannerData?.backgroundImageTitle || file.name,
      });
    });
    event.target.value = "";
  };

  const handleBannerVideoFileChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    showBannerGenerationLoader("video");
    readBannerBackgroundFile(file, (dataUrl) => {
      updateActiveBannerData({
        bannerBackgroundMode: "video",
        backgroundVideo: dataUrl,
      });
    });
    event.target.value = "";
  };

  const handleBannerSlideImageFileChange = (
    index: number,
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    showBannerGenerationLoader("image");
    readBannerBackgroundFile(file, (dataUrl) => {
      updateBannerSlide(index, "image", dataUrl);
      updateBannerSlide(index, "alt", file.name);
    });
    event.target.value = "";
  };

  const handleBannerSlideVideoFileChange = (
    index: number,
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    showBannerGenerationLoader("video");
    readBannerBackgroundFile(file, (dataUrl) => {
      updateBannerSlide(index, "video", dataUrl);
      updateBannerSlide(index, "alt", file.name);
    });
    event.target.value = "";
  };

  const deleteBannerSlideVideo = (index: number) => {
    updateBannerSlide(index, "video", "");
  };

  const updateBannerHeight = (height: number) => {
    updateActiveBannerData({ bannerHeight: clampBannerHeight(height) });
  };

  const updateBannerButton = (
    index: number,
    field: keyof ButtonData,
    value: string | boolean,
  ) => {
    const nextValue = field === "label" && typeof value === "string" ? limitLinkText(value) : value;
    const updatedButtons = (activeBannerData?.buttons ?? []).map(
      (button, buttonIndex) =>
        buttonIndex === index ? { ...button, [field]: nextValue } : button,
    );

    updateActiveBannerData({ buttons: updatedButtons });
  };

  const addBannerButton = () => {
    if ((activeBannerData?.buttons ?? []).length >= MAX_BANNER_BUTTONS) return;

    const updatedButtons = [
      ...(activeBannerData?.buttons ?? []),
      { label: "New Button", href: "#", icon: "none", iconPosition: "after", openInNewTab: false },
    ];

    updateActiveBannerData({ buttons: updatedButtons });
  };

  const deleteBannerButton = (index: number) => {
    const updatedButtons = (activeBannerData?.buttons ?? []).filter(
      (_, buttonIndex) => buttonIndex !== index,
    );

    updateActiveBannerData({ buttons: updatedButtons });
  };

  const updateBannerSlide = (
    index: number,
    field: keyof Omit<BannerSlideData, "button">,
    value: string,
  ) => {
    const updatedSlides = (activeBannerData?.bannerSlides ?? []).map(
      (slide, slideIndex) =>
        slideIndex === index ? { ...slide, [field]: value } : slide,
    );

    updateActiveBannerData({ bannerSlides: updatedSlides });
  };

  const emptyBannerSlideButton = (
    variant: "primary" | "secondary" = "primary",
  ): ButtonData => ({
    label: "New Button",
    href: "#",
    variant,
    icon: "none",
    iconPosition: "after",
    openInNewTab: false,
  });

  const getBannerSlideButtons = (slide?: BannerSlideData) =>
    resolveBannerSlideButtons(slide, activeBannerData?.buttons, MAX_BANNER_BUTTONS);

  const persistBannerSlideButtons = (slideIndex: number, buttons: ButtonData[]) => {
    const next = buttons.slice(0, MAX_BANNER_BUTTONS);
    const updatedSlides = (activeBannerData?.bannerSlides ?? []).map(
      (slide, index) =>
        index === slideIndex
          ? { ...slide, buttons: next, button: next[0] }
          : slide,
    );
    updateActiveBannerData({ bannerSlides: updatedSlides });
  };

  const updateBannerSlideButton = (
    slideIndex: number,
    buttonIndex: number,
    field: keyof ButtonData,
    value: string | boolean,
  ) => {
    const nextValue = field === "label" && typeof value === "string" ? limitLinkText(value) : value;
    const slide = activeBannerData?.bannerSlides?.[slideIndex];
    const list = [...getBannerSlideButtons(slide)];
    while (list.length <= buttonIndex) {
      list.push(emptyBannerSlideButton(list.length === 0 ? "primary" : "secondary"));
    }
    list[buttonIndex] = { ...list[buttonIndex], [field]: nextValue };
    persistBannerSlideButtons(slideIndex, list);
  };

  const addBannerSlideButton = (slideIndex: number) => {
    const list = [...getBannerSlideButtons(activeBannerData?.bannerSlides?.[slideIndex])];
    if (list.length >= MAX_BANNER_BUTTONS) return;
    list.push(emptyBannerSlideButton(list.length === 0 ? "primary" : "secondary"));
    persistBannerSlideButtons(slideIndex, list);
  };

  const deleteBannerSlideButton = (slideIndex: number, buttonIndex: number) => {
    persistBannerSlideButtons(
      slideIndex,
      getBannerSlideButtons(activeBannerData?.bannerSlides?.[slideIndex]).filter(
        (_, index) => index !== buttonIndex,
      ),
    );
  };

  const addBannerSlide = () => {
    const updatedSlides = [
      ...(activeBannerData?.bannerSlides ?? []),
      {
        image: "",
        ...(isVideoSliderBanner ? { video: "" } : {}),
        alt: "",
        pretitle: "",
        title: "",
        desc: "",
        button: {
          label: "",
          href: "#",
          variant: "primary" as const,
          icon: "none",
          iconPosition: "after" as const,
          openInNewTab: false,
        },
        buttons: [],
      },
    ];

    updateActiveBannerData({ bannerSlides: updatedSlides });
  };

  const deleteBannerSlide = (index: number) => {
    const updatedSlides = (activeBannerData?.bannerSlides ?? []).filter(
      (_, slideIndex) => slideIndex !== index,
    );

    updateActiveBannerData({ bannerSlides: updatedSlides });
  };

  const updateFooterBackgroundType = (type: FooterBackgroundType) => {
    updateActiveFooterData({ footerBackgroundType: type });
  };

  const updateFooterSolidColor = (color: string) => {
    updateActiveFooterData({ footerBackgroundColor: color });
  };

  const updateFooterGradientColor = (color: string) => {
    updateActiveFooterData({ footerGradientColor: color });
  };

  const updateFooterTextColor = (color: string) => {
    updateActiveFooterData({ footerTextColor: color });
  };

  const updateFooterLogoImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        updateActiveFooterData({ logoImage: reader.result, logoImageTitle: file.name });
      }
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const updateFooterColumn = (columnIndex: number, field: "title", value: string) => {
    const columns = [...(activeFooterData?.footerColumns ?? [])];
    columns[columnIndex] = { ...columns[columnIndex], [field]: value };
    updateActiveFooterData({ footerColumns: columns });
  };

  const toggleFooterColumnHidden = (columnIndex: number) => {
    const columns = [...(activeFooterData?.footerColumns ?? [])];
    const column = columns[columnIndex];
    if (!column) return;
    columns[columnIndex] = { ...column, hidden: !column.hidden };
    updateActiveFooterData({ footerColumns: columns });
  };

  const moveFooterColumn = (fromIndex: number, toIndex: number) => {
    const columns = [...(activeFooterData?.footerColumns ?? [])];
    if (
      fromIndex === toIndex ||
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= columns.length ||
      toIndex >= columns.length
    ) {
      return;
    }
    const [moved] = columns.splice(fromIndex, 1);
    columns.splice(toIndex, 0, moved);
    updateActiveFooterData({ footerColumns: columns });
  };

  const updateFooterLink = (columnIndex: number, linkIndex: number, field: "label" | "href", value: string) => {
    const columns = [...(activeFooterData?.footerColumns ?? [])];
    const column = columns[columnIndex];
    if (!column) return;
    const links = [...column.links];
    links[linkIndex] = { ...links[linkIndex], [field]: value };
    columns[columnIndex] = { ...column, links };
    updateActiveFooterData({ footerColumns: columns });
  };

  const moveFooterLink = (
    columnIndex: number,
    fromIndex: number,
    toIndex: number,
  ) => {
    const columns = [...(activeFooterData?.footerColumns ?? [])];
    const column = columns[columnIndex];
    if (!column) return;
    const links = [...column.links];
    if (
      fromIndex === toIndex ||
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= links.length ||
      toIndex >= links.length
    ) {
      return;
    }
    const [moved] = links.splice(fromIndex, 1);
    links.splice(toIndex, 0, moved);
    columns[columnIndex] = { ...column, links };
    updateActiveFooterData({ footerColumns: columns });
  };

  const openFooterHrefPicker = (columnIndex: number, linkIndex: number) => {
    const currentHref =
      activeFooterData?.footerColumns?.[columnIndex]?.links?.[linkIndex]
        ?.href ?? "";
    setHrefPicker({ source: "footer", columnIndex, linkIndex });
    setHrefPickerKind(detectNavHrefPickerKind(currentHref));
    setHrefPickerValue(currentHref);
  };

  const openGenericHrefPicker = (
    path: GenericFieldPath,
    currentHref: string,
  ) => {
    setHrefPicker({ source: "generic", path });
    setHrefPickerKind(detectNavHrefPickerKind(currentHref));
    setHrefPickerValue(currentHref);
  };

  const openHeaderButtonHrefPicker = (index: number) => {
    const currentHref = activeHeaderData?.buttons?.[index]?.href ?? "";
    setHrefPicker({ source: "header-button", index });
    setHrefPickerKind(detectNavHrefPickerKind(currentHref));
    setHrefPickerValue(currentHref);
  };

  const openBannerButtonHrefPicker = (index: number) => {
    const currentHref = activeBannerData?.buttons?.[index]?.href ?? "";
    setHrefPicker({ source: "banner-button", index });
    setHrefPickerKind(detectNavHrefPickerKind(currentHref));
    setHrefPickerValue(currentHref);
  };

  const openBannerSlideButtonHrefPicker = (slideIndex: number, buttonIndex: number) => {
    const currentHref =
      getBannerSlideButtons(activeBannerData?.bannerSlides?.[slideIndex])[buttonIndex]
        ?.href ?? "";
    setHrefPicker({ source: "banner-slide-button", slideIndex, buttonIndex });
    setHrefPickerKind(detectNavHrefPickerKind(currentHref));
    setHrefPickerValue(currentHref);
  };

  const addFooterLink = (columnIndex: number) => {
    const columns = [...(activeFooterData?.footerColumns ?? [])];
    const column = columns[columnIndex];
    if (!column) return;
    columns[columnIndex] = { ...column, links: [...column.links, { label: "New link", href: "#" }] };
    updateActiveFooterData({ footerColumns: columns });
  };

  const removeFooterLink = (columnIndex: number, linkIndex: number) => {
    const columns = [...(activeFooterData?.footerColumns ?? [])];
    const column = columns[columnIndex];
    if (!column) return;
    columns[columnIndex] = { ...column, links: column.links.filter((_, index) => index !== linkIndex) };
    updateActiveFooterData({ footerColumns: columns });
  };

  const floatingItems = getFloatingItems(activeFooterData);

  const saveFloatingItems = (items: FloatingItemData[]) => {
    const legacy = syncLegacyFloatingLinks(items);
    updateActiveFooterData({
      floatingItems: items,
      whatsappLink: legacy.whatsappLink,
      callLink: legacy.callLink,
    });
  };

  const updateFloatingItem = (
    index: number,
    patch: Partial<FloatingItemData>,
  ) => {
    const next = floatingItems.map((item, itemIndex) =>
      itemIndex === index ? { ...item, ...patch } : item,
    );
    saveFloatingItems(next);
  };

  const moveFloatingItem = (fromIndex: number, toIndex: number) => {
    if (
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= floatingItems.length ||
      toIndex >= floatingItems.length ||
      fromIndex === toIndex
    ) {
      return;
    }
    const next = [...floatingItems];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    saveFloatingItems(next);
  };

  const addDropdownItem = (menuIndex: number) => {
    const item = menuItems[menuIndex];
    const currentDropdowns = item?.children ?? [];
    const maxChildren =
      item?.menuType === "mega" ? MAX_MEGA_LINKS : MAX_DROPDOWN_LINKS;

    if (currentDropdowns.length >= maxChildren) return;

    const updatedMenu = menuItems.map((menuItem, itemIndex) =>
      itemIndex === menuIndex
        ? {
            ...menuItem,
            menuType:
              menuItem.menuType === "mega" ? ("mega" as const) : ("dropdown" as const),
            children: [
              ...(menuItem.children ?? []),
              {
                label:
                  menuItem.menuType === "mega" ? "Mega Item" : "Dropdown Item",
                href: "",
              },
            ],
          }
        : menuItem,
    );

    updateActiveHeaderData({ menu: updatedMenu });
  };

  const setMenuItemType = (
    menuIndex: number,
    menuType: "link" | "dropdown" | "mega",
  ) => {
    const updatedMenu = menuItems.map((item, itemIndex) => {
      if (itemIndex !== menuIndex) return item;

      if (menuType === "link") {
        return { ...item, menuType: "link" as const, children: undefined };
      }

      const existingChildren = item.children ?? [];
      const seedChildren =
        existingChildren.length > 0
          ? existingChildren
          : [
              {
                label: menuType === "mega" ? "Mega Item" : "Dropdown Item",
                href: "",
              },
            ];

      return {
        ...item,
        menuType,
        children: seedChildren.slice(
          0,
          menuType === "mega" ? MAX_MEGA_LINKS : MAX_DROPDOWN_LINKS,
        ),
      };
    });

    updateActiveHeaderData({ menu: updatedMenu });
  };

  const updateDropdownItem = (
    menuIndex: number,
    childIndex: number,
    field: keyof MenuItem,
    value: string,
  ) => {
    const nextValue = field === "label" ? limitLinkText(value) : value;
    const updatedMenu = menuItems.map((item, itemIndex) => {
      if (itemIndex !== menuIndex) return item;

      const updatedChildren = (item.children ?? []).map(
        (child, currentChildIndex) =>
          currentChildIndex === childIndex
            ? { ...child, [field]: nextValue }
            : child,
      );

      return { ...item, children: updatedChildren };
    });

    updateActiveHeaderData(
      { menu: updatedMenu },
      { syncPageLinks: field !== "label" },
    );
  };

  const deleteDropdownItem = (menuIndex: number, childIndex: number) => {
    const updatedMenu = menuItems.map((item, itemIndex) => {
      if (itemIndex !== menuIndex) return item;

      const updatedChildren = (item.children ?? []).filter(
        (_, currentChildIndex) => currentChildIndex !== childIndex,
      );

      return {
        ...item,
        children: updatedChildren.length ? updatedChildren : undefined,
      };
    });

    updateActiveHeaderData({ menu: updatedMenu });
  };

  const deleteMenuItem = (index: number) => {
    const updatedMenu = menuItems.filter((_, itemIndex) => itemIndex !== index);

    updateActiveHeaderData({ menu: updatedMenu });
  };

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [menuDropTargetIndex, setMenuDropTargetIndex] = useState<number | null>(
    null,
  );
  const menuReorderRef = useRef<{
    fromIndex: number;
    pointerId: number;
    dropIndex: number;
  } | null>(null);
  const [draggedFooterColumnIndex, setDraggedFooterColumnIndex] = useState<
    number | null
  >(null);
  const [draggedFooterLink, setDraggedFooterLink] = useState<{
    columnIndex: number;
    linkIndex: number;
  } | null>(null);

  useEffect(() => {
    if (!scrollToNewMenuItem) return;

    const frame = window.requestAnimationFrame(() => {
      lastMenuItemRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
      newMenuLabelInputRef.current?.focus();
      newMenuLabelInputRef.current?.select();
      setScrollToNewMenuItem(false);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [scrollToNewMenuItem, menuItems.length]);

  const moveMenuItem = (fromIndex: number, toIndex: number) => {
    if (
      fromIndex === toIndex ||
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= menuItems.length ||
      toIndex >= menuItems.length
    ) {
      return;
    }

    const updatedMenu = [...menuItems];
    const [movedItem] = updatedMenu.splice(fromIndex, 1);
    if (!movedItem) return;
    updatedMenu.splice(toIndex, 0, movedItem);

    updateActiveHeaderData({ menu: updatedMenu });
  };

  const endMenuReorder = () => {
    const active = menuReorderRef.current;
    menuReorderRef.current = null;
    setDraggedIndex(null);
    setMenuDropTargetIndex(null);
    if (!active) return;
    if (active.dropIndex !== active.fromIndex) {
      moveMenuItem(active.fromIndex, active.dropIndex);
    }
  };

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[10050]"
      onPointerUp={handleModalPointerUp}
      onPointerCancel={handleModalPointerUp}
    >
      <div
        className="pointer-events-auto absolute inset-0 bg-slate-950/55 backdrop-blur-[6px]"
        aria-hidden="true"
      />
      <div
        className={`pointer-events-auto fixed z-10 h-[min(84vh,680px)] w-[min(calc(100vw-1.5rem),980px)] cursor-grab flex-col overflow-hidden rounded-[28px] border border-white/70 bg-[#f4f6f9] shadow-[0_40px_100px_rgba(8,19,47,0.38)] animate-editor-pop active:cursor-grabbing ${
          generationText ? "hidden" : "flex"
        }`}
        style={{
          left: `calc((100vw - min(calc(100vw - 1.5rem), 980px)) / 2 + ${modalPosition.x}px)`,
          top: `calc(8vh + ${modalPosition.y}px)`,
          touchAction: dragStart ? "none" : "auto",
        }}
        onPointerDown={handleModalPointerDown}
      >
        <div
          className={`relative flex items-center justify-between gap-3 border-b border-slate-200/80 bg-white px-4 py-2.5 sm:px-5 ${
            dragStart ? "cursor-grabbing" : "cursor-grab"
          }`}
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#315ff4] to-[#1d4ed8] text-white shadow-[0_6px_14px_rgba(49,95,244,0.3)]">
              <Sparkles size={14} strokeWidth={2.2} />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  Section editor
                </p>
                <span className="hidden items-center gap-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-500 sm:inline-flex">
                  <Move size={9} />
                  Drag to move
                </span>
              </div>
              <h3
                className={`${agrandirBolt.className} truncate text-[1.15rem] font-medium leading-tight text-slate-950`}
              >
            {editorTitle || formatSectionTitle(sectionType)}
          </h3>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => setMobileSidebarOpen((open) => !open)}
              className="grid size-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 lg:hidden"
            aria-label={
              mobileSidebarOpen ? "Close settings menu" : "Open settings menu"
            }
            aria-expanded={mobileSidebarOpen}
          >
              {mobileSidebarOpen ? <X size={15} /> : <Menu size={15} />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="grid size-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800"
              aria-label="Close editor"
            >
              <X size={15} />
          </button>
          </div>
        </div>

        <div className="relative flex min-h-0 flex-1">
          {mobileSidebarOpen && (
            <aside className="absolute inset-y-0 left-0 z-30 flex w-[15.5rem] flex-col border-r border-slate-200 bg-white p-2.5 shadow-2xl lg:hidden">
              <div className="mb-2 px-1.5">
                <h3
                  className={`${generalSansMedium.className} text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400`}
                >
                  Settings
                </h3>
                <p className="mt-0.5 text-[10px] text-slate-500">
                  Jump to content, layout, or menu.
                </p>
              </div>

              <SidebarContent
                items={visibleSidebarItems}
                activeTab={activeTab}
                setActiveTab={handleSidebarTabChange}
              />
            </aside>
          )}

          <aside className="hidden h-full min-h-0 w-[15.5rem] shrink-0 flex-col border-r border-slate-200/90 bg-white/95 p-2.5 lg:flex">
            <div className="mb-2 px-1.5">
              <h3
                className={`${generalSansMedium.className} text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400`}
              >
                Settings
              </h3>
              <p className="mt-0.5 text-[10px] leading-4 text-slate-500">
                Jump to content, layout, or menu.
              </p>
            </div>

            <SidebarContent
              items={visibleSidebarItems}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
            />
          </aside>

          <main
            data-section-editor-scroll
            className="min-w-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6"
          >
            {!usesSectionColorPanel && (
              <div className="mb-4 rounded-xl border border-slate-200/90 bg-white px-3.5 py-3 shadow-[0_8px_28px_rgba(15,23,42,0.05)] sm:px-4">
                <div className="flex items-start gap-2.5">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                    {(() => {
                      const Icon = getSidebarTabIcon(activeTab);
                      return <Icon size={14} strokeWidth={2.2} />;
                    })()}
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-[13px] font-semibold tracking-[-0.02em] text-slate-900">
                    {activeTab}
                  </h3>
                    <p className="mt-0.5 max-w-xl text-[11px] leading-4 text-slate-500">
                      {getEditorTabHelp(activeTab, isSinglePage)}
                  </p>
                  </div>
                </div>

                {false &&
                  activeSectionType === "Header" &&
                  activeTab === "Header Layout" && (
                    <div className="relative mt-4 flex w-full flex-wrap items-center gap-3 sm:w-auto sm:shrink-0 sm:gap-5">
                      {headerBackgroundType === "solid" ? (
                        <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-gray-950">
                          Change color
                          <span
                            className="h-5 w-5 rounded-full border-2 border-gray-400"
                            style={{ background: headerSolidColor }}
                          />
                          <input
                            type="color"
                            value={headerSolidColor}
                            onChange={(event) =>
                              updateHeaderSolidColor(event.target.value)
                            }
                            className="h-8 w-8 cursor-pointer rounded border-0 bg-transparent p-0"
                            aria-label="Header solid color"
                          />
                        </label>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setColorPanelOpen((open) => !open)}
                          className="flex items-center gap-2 text-sm font-semibold text-gray-950"
                        >
                          Change color
                          <span
                            className="h-5 w-10 rounded-full border-2 border-gray-400"
                            style={{ background: headerPreviewBackground }}
                          />
                        </button>
                      )}

                      {(["solid", "gradient"] as const).map((type) => {
                        const isActive = headerBackgroundType === type;

                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => updateHeaderBackgroundType(type)}
                            className={`min-w-24 rounded-lg border px-5 py-1.5 text-sm font-semibold capitalize text-gray-950 transition ${
                              isActive
                                ? "border-gray-300 bg-white shadow-sm"
                                : "border-gray-500 bg-transparent hover:bg-white"
                            }`}
                          >
                            {type}
                          </button>
                        );
                      })}

                      {headerBackgroundType === "gradient" &&
                        colorPanelOpen && (
                          <div className="absolute right-0 top-11 z-20 grid w-72 grid-cols-2 gap-6 rounded-xl border border-gray-300 bg-white p-4 pt-7 shadow-xl">
                            <button
                              type="button"
                              onClick={() => setColorPanelOpen(false)}
                              className="absolute right-3 top-2 rounded-full p-1 text-gray-950 hover:bg-gray-100"
                              aria-label="Close gradient color picker"
                            >
                              <X size={18} />
                            </button>

                            <label className="space-y-4 text-sm font-semibold text-gray-950">
                              <span className="underline">Left Side</span>
                              <span className="flex items-center justify-between gap-3">
                                Color
                                <input
                                  type="color"
                                  value={headerSolidColor}
                                  onChange={(event) =>
                                    updateHeaderSolidColor(event.target.value)
                                  }
                                  className="h-9 w-9 cursor-pointer rounded border-0 bg-transparent p-0"
                                  aria-label="Header gradient left color"
                                />
                              </span>
                            </label>

                            <label className="space-y-4 text-sm font-semibold text-gray-950">
                              <span className="underline">Right Side</span>
                              <span className="flex items-center justify-between gap-3">
                                Color
                                <input
                                  type="color"
                                  value={headerGradientColor}
                                  onChange={(event) =>
                                    updateHeaderGradientColor(
                                      event.target.value,
                                    )
                                  }
                                  className="h-9 w-9 cursor-pointer rounded border-0 bg-transparent p-0"
                                  aria-label="Header gradient right color"
                                />
                              </span>
                            </label>
                          </div>
                        )}
                    </div>
                  )}

                {false &&
                  activeSectionType === "Footer" &&
                  activeTab === "Footer Layout" && (
                    <div className="relative flex w-full flex-wrap items-center gap-3 sm:w-auto sm:shrink-0 sm:gap-5">
                      {footerBackgroundType === "solid" ? (
                        <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-gray-950">
                          Change color
                          <span
                            className="h-5 w-5 rounded-full border-2 border-gray-400"
                            style={{ background: footerSolidColor }}
                          />
                          <input
                            type="color"
                            value={footerSolidColor}
                            onChange={(event) =>
                              updateFooterSolidColor(event.target.value)
                            }
                            className="h-8 w-8 cursor-pointer rounded border-0 bg-transparent p-0"
                            aria-label="Footer solid color"
                          />
                        </label>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setColorPanelOpen((open) => !open)}
                          className="flex items-center gap-2 text-sm font-semibold text-gray-950"
                        >
                          Change color
                          <span
                            className="h-5 w-10 rounded-full border-2 border-gray-400"
                            style={{ background: footerPreviewBackground }}
                          />
                        </button>
                      )}

                      {(["solid", "gradient"] as const).map((type) => {
                        const isActive = footerBackgroundType === type;

                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => updateFooterBackgroundType(type)}
                            className={`min-w-24 rounded-lg border px-5 py-1.5 text-sm font-semibold capitalize text-gray-950 transition ${
                              isActive
                                ? "border-gray-300 bg-white shadow-sm"
                                : "border-gray-500 bg-transparent hover:bg-white"
                            }`}
                          >
                            {type}
                          </button>
                        );
                      })}

                      {footerBackgroundType === "gradient" &&
                        colorPanelOpen && (
                          <div className="absolute right-0 top-11 z-20 grid w-72 grid-cols-2 gap-6 rounded-xl border border-gray-300 bg-white p-4 pt-7 shadow-xl">
                            <button
                              type="button"
                              onClick={() => setColorPanelOpen(false)}
                              className="absolute right-3 top-2 rounded-full p-1 text-gray-950 hover:bg-gray-100"
                              aria-label="Close footer gradient color picker"
                            >
                              <X size={18} />
                            </button>

                            <label className="space-y-4 text-sm font-semibold text-gray-950">
                              <span className="underline">Left Side</span>
                              <span className="flex items-center justify-between gap-3">
                                Color
                                <input
                                  type="color"
                                  value={footerSolidColor}
                                  onChange={(event) =>
                                    updateFooterSolidColor(event.target.value)
                                  }
                                  className="h-9 w-9 cursor-pointer rounded border-0 bg-transparent p-0"
                                  aria-label="Footer gradient left color"
                                />
                              </span>
                            </label>

                            <label className="space-y-4 text-sm font-semibold text-gray-950">
                              <span className="underline">Right Side</span>
                              <span className="flex items-center justify-between gap-3">
                                Color
                                <input
                                  type="color"
                                  value={footerGradientColor}
                                  onChange={(event) =>
                                    updateFooterGradientColor(
                                      event.target.value,
                                    )
                                  }
                                  className="h-9 w-9 cursor-pointer rounded border-0 bg-transparent p-0"
                                  aria-label="Footer gradient right color"
                                />
                              </span>
                            </label>
                          </div>
                        )}
                    </div>
                  )}
              </div>
            )}

            {activeSectionType === "Topbar" &&
              activeTab === "Topbar Settings" && (
                  <SectionColorPanel
                  title="Topbar Settings"
                    sectionTypeLabel="Topbar Type"
                    stickyType={topbarType}
                    backgroundType={topbarBackgroundType}
                    backgroundColor={topbarSolidColor}
                    gradientColor={topbarGradientColor}
                    textColor={topbarTextColor}
                    onStickyTypeChange={updateTopbarType}
                    onBackgroundTypeChange={updateTopbarBackgroundType}
                    onBackgroundColorChange={updateTopbarSolidColor}
                    onGradientColorChange={updateTopbarGradientColor}
                    onTextColorChange={updateTopbarTextColor}
                  />
              )}

            {activeSectionType === "Topbar" &&
              activeTab === "Topbar Layout" && (
                <div className="space-y-4">
                  {layoutOptions.map((layout) => {
                    const isActive = currentSection?.variant === layout.id;
                    const layoutSkin = TOPBAR_LAYOUT_SKINS[layout.id];
                    const cardBackground =
                      layoutSkin?.topbarBackgroundColor ??
                      topbarPreviewBackground;
                    const cardTextColor =
                      layoutSkin?.topbarTextColor ?? topbarTextColor;

                    if (layout.isDatabase) {
                      return (
                        <DatabaseLayoutOptionCard
                          key={layout.id}
                          layout={layout}
                          category={category}
                          active={isActive}
                          liveContent={
                            activeTopbarData as Record<string, unknown>
                          }
                          onSelect={() => selectSectionVariant(layout.id)}
                          editorPart={eventsEditorPart}
                        />
                      );
                    }

                    return (
                      <button
                        key={layout.id}
                        type="button"
                        onClick={() => selectSectionVariant(layout.id)}
                        className={`relative w-full overflow-hidden rounded-2xl border bg-white text-left ${
                          isActive ? "border-gray-400" : "border-gray-200"
                        }`}
                      >
                        <SelectedLayoutBadge active={isActive} />
                        <div
                          className="flex h-20 items-center justify-between px-5"
                          style={{
                            background: cardBackground,
                            color: cardTextColor,
                          }}
                        >
                          <div className="h-2 w-32 rounded bg-current opacity-80" />
                          <div className="flex items-center gap-3">
                            <div className="h-2 w-20 rounded bg-current opacity-70" />
                            <div className="h-2 w-24 rounded bg-current opacity-70" />
                            <div className="flex gap-2">
                              <div className="h-4 w-4 rounded-full bg-current opacity-80" />
                              <div className="h-4 w-4 rounded-full bg-current opacity-80" />
                              <div className="h-4 w-4 rounded-full bg-current opacity-80" />
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

            {activeSectionType === "Topbar" &&
              activeTab === "Topbar Content" && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_4px_18px_rgba(15,23,42,0.04)] sm:p-5">
                    <div className="flex items-center justify-between gap-3">
                      <label className="block text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-500">Topbar Text</label>
                      <VisibilityButton hidden={isTopbarFieldHidden("text")} onClick={() => toggleTopbarFieldVisibility("text")} />
                    </div>
                    <input
                      value={activeTopbarData?.text?.[0] ?? ""}
                      onChange={(event) => updateTopbarText(event.target.value)}
                      className="mt-2 h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#315ff4] focus:ring-2 focus:ring-[#315ff4]/15"
                      placeholder="Announcement or offer text visitors see at the top…"
                    />
                  </div>

                  <div className="grid gap-4 lg:grid-cols-3">
                    {(["phone", "email", "location"] as const).map((field) => (
                      <div
                        key={field}
                        className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_4px_18px_rgba(15,23,42,0.04)] sm:p-5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <label className="block text-[10px] font-semibold capitalize tracking-[0.04em] text-slate-500">{field}</label>
                          <VisibilityButton hidden={isTopbarFieldHidden(field)} onClick={() => toggleTopbarFieldVisibility(field)} />
                        </div>
                        <input
                          value={activeTopbarData?.[field] ?? ""}
                          onChange={(event) =>
                            updateTopbarField(field, event.target.value)
                          }
                          className="mt-2 h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#315ff4] focus:ring-2 focus:ring-[#315ff4]/15"
                          placeholder={
                            field === "phone"
                              ? "e.g. +91 98765 43210"
                              : field === "email"
                                ? "e.g. hello@company.com"
                                : "City or address…"
                          }
                        />
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_4px_18px_rgba(15,23,42,0.04)] sm:p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h4 className="text-xs font-semibold text-slate-800">
                          Social Icons
                        </h4>
                        <p className="mt-1 text-xs text-gray-500">
                          You can add up to {MAX_TOPBAR_SOCIAL_LINKS} social
                          icons.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={addTopbarSocialLink}
                        disabled={
                          topbarSocialLinks.length >= MAX_TOPBAR_SOCIAL_LINKS
                        }
                        className={`${contentAddButtonClass} disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none`}
                      >
                        <Plus size={14} />
                        Add icon
                      </button>
                    </div>
                    <div className="flex justify-end">
                      <VisibilityButton hidden={isTopbarFieldHidden("socialLinks")} onClick={() => toggleTopbarFieldVisibility("socialLinks")} />
                    </div>

                    <div className="space-y-3">
                      {topbarSocialLinks.map((socialLink, index) => (
                        <div
                          key={index}
                          className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-slate-50/50 p-3.5 ring-1 ring-slate-100 lg:grid-cols-[minmax(8rem,1fr)_minmax(8rem,1fr)_auto]"
                        >
                          <select
                            value={socialLink.label}
                            onChange={(event) =>
                              updateTopbarSocialLink(
                                index,
                                "label",
                                event.target.value as SocialLinkData["label"],
                              )
                            }
                            className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs outline-none transition focus:border-[#315ff4] focus:ring-2 focus:ring-[#315ff4]/15"
                          >
                            {SOCIAL_PLATFORM_OPTIONS.map((platform) => (
                              <option key={platform.id} value={platform.id}>
                                {platform.label}
                              </option>
                            ))}
                          </select>

                          <input
                            type="url"
                            value={socialLink.href}
                            onChange={(event) =>
                              updateTopbarSocialLink(
                                index,
                                "href",
                                event.target.value,
                              )
                            }
                            className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#315ff4] focus:ring-2 focus:ring-[#315ff4]/15"
                            placeholder="https://..."
                            aria-label={`${socialLink.label} URL`}
                          />

                          <button
                            type="button"
                            onClick={() => deleteTopbarSocialLink(index)}
                            className="grid size-11 place-items-center rounded-xl border border-red-100 bg-white text-red-600 transition hover:bg-red-50"
                            aria-label="Delete social icon"
                          >
                            <Trash size={15} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

            {activeSectionType === "Header" &&
              activeTab === "Header Content" && (
                <div className="space-y-5">
                  <div className="space-y-4 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_4px_18px_rgba(15,23,42,0.04)] sm:p-5">
                    <h4 className="text-sm font-bold text-slate-900">
                      Logo
                    </h4>

                    <label className="block text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-500">
                      Logo Text
                    </label>
                    <input
                      value={activeHeaderData?.logo ?? ""}
                      onChange={(event) => updateHeaderLogo(event.target.value)}
                      className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#315ff4] focus:ring-2 focus:ring-[#315ff4]/15"
                      placeholder="Your brand name…"
                    />

                    <div className="space-y-2">
                      <span className={contentFieldLabelClass}>
                        Logo image
                      </span>
                    <ContentMediaPickButton
                      hasFile={Boolean(activeHeaderData?.logoImage)}
                      mediaKind="image"
                      fileLabel={
                        activeHeaderData?.logoImageTitle ??
                            activeHeaderData?.logoImage ??
                        "No image selected"
                      }
                      onClick={() =>
                        openImagePicker(
                          "Header Logo Image",
                          activeHeaderData?.logoImage ?? "",
                          (source, fileName) =>
                            updateActiveHeaderData({
                              logoImage: source,
                              logoImageTitle:
                                activeHeaderData?.logoImageTitle || fileName,
                            }),
                        )
                      }
                    />

                      {activeHeaderData?.logoImage && (
                        <button
                          type="button"
                          onClick={deleteHeaderLogoImage}
                          className="rounded-md border border-red-500 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                        >
                          Remove logo image
                        </button>
                      )}
                      <input
                        value={activeHeaderData?.logoImageTitle ?? ""}
                        onChange={(event) =>
                          updateActiveHeaderData({
                            logoImageTitle: event.target.value,
                          })
                        }
                        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#315ff4] focus:ring-2 focus:ring-[#315ff4]/15"
                        placeholder="Describe logo for accessibility…"
                      />
                    </div>
                  </div>

                  {isEventsHeader ? null : (
                  <div className={`${contentFieldCardClass} space-y-4`}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h4 className="text-xs font-semibold text-slate-800">
                          Header buttons
                        </h4>
                        <p className="mt-0.5 text-[10px] text-slate-500">
                          {(activeHeaderData?.buttons ?? []).length}/
                          {MAX_HEADER_BUTTONS} action buttons
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={addHeaderButton}
                        disabled={
                          (activeHeaderData?.buttons ?? []).length >=
                          MAX_HEADER_BUTTONS
                        }
                        className={`${contentAddButtonClass} disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none`}
                      >
                        <Plus size={14} />
                        Add button
                      </button>
                    </div>

                    <div className="space-y-3">
                      {(activeHeaderData?.buttons ?? []).map((button, index) => (
                        <ContentAccordionItem
                          key={index}
                          title={`Button ${index + 1}`}
                          summary={button.label || undefined}
                          open={headerButtonAccordion.expandedIndex === index}
                          onToggle={() =>
                            headerButtonAccordion.toggleIndex(index)
                          }
                          onDelete={() => deleteHeaderButton(index)}
                          deleteAriaLabel="Delete header button"
                          itemRef={(node) =>
                            headerButtonAccordion.setItemRef(index, node)
                          }
                        >
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <label className={contentFieldLabelClass}>
                                Label
                              </label>
                          <input
                            value={button.label}
                            onChange={(event) =>
                              updateHeaderButton(
                                index,
                                "label",
                                event.target.value,
                              )
                            }
                                className={contentFieldInputClass}
                                placeholder="e.g. Get started"
                              />
                            </div>
                            <div>
                              <label className={contentFieldLabelClass}>
                                Link
                              </label>
                              <HrefDestinationButton
                            value={button.href}
                                onClick={() => openHeaderButtonHrefPicker(index)}
                                className="mt-1.5 h-9"
                              />
                            </div>
                          </div>

                          <div className="grid gap-3 sm:grid-cols-3">
                            <div>
                              <label className={contentFieldLabelClass}>
                                Style
                              </label>
                          <select
                            value={button.variant ?? "primary"}
                            onChange={(event) =>
                              updateHeaderButton(
                                index,
                                "variant",
                                event.target.value,
                              )
                            }
                                className={contentFieldInputClass}
                            aria-label="Header button style"
                          >
                            <option value="primary">Primary</option>
                            <option value="secondary">Secondary</option>
                          </select>
                            </div>
                            <div>
                              <label className={contentFieldLabelClass}>
                                Icon
                              </label>
                              <select
                                value={button.icon ?? "none"}
                                onChange={(event) =>
                                  updateHeaderButton(
                                    index,
                                    "icon",
                                    event.target.value,
                                  )
                                }
                                className={contentFieldInputClass}
                                aria-label="Header button icon"
                              >
                                <option value="none">No icon</option>
                                <option value="arrow-right">Arrow right</option>
                                <option value="arrow-left">Arrow left</option>
                                <option value="plus">Plus</option>
                                <option value="phone">Phone</option>
                                <option value="mail">Mail</option>
                                <option value="external-link">
                                  External link
                                </option>
                              </select>
                        </div>
                            <div>
                              <label className={contentFieldLabelClass}>
                                Icon position
                              </label>
                              <select
                                value={button.iconPosition ?? "after"}
                                onChange={(event) =>
                                  updateHeaderButton(
                                    index,
                                    "iconPosition",
                                    event.target.value,
                                  )
                                }
                                className={contentFieldInputClass}
                                aria-label="Header button icon position"
                              >
                                <option value="before">Icon before</option>
                                <option value="after">Icon after</option>
                              </select>
                            </div>
                          </div>

                          <label className="inline-flex h-9 max-w-full items-center gap-2 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700">
                            <input
                              type="checkbox"
                              checked={button.openInNewTab === true}
                              onChange={(event) =>
                                updateHeaderButton(
                                  index,
                                  "openInNewTab",
                                  event.target.checked,
                                )
                              }
                              className="size-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500/30"
                            />
                            Open in new tab
                          </label>
                        </ContentAccordionItem>
                      ))}
                    </div>
                  </div>
                  )}
                </div>
              )}

            {activeSectionType === "Header" &&
              activeTab === "Header Settings" && (
                  <SectionColorPanel
                  title="Header Settings"
                    sectionTypeLabel="Header Type"
                    stickyType={headerType}
                    backgroundType={headerBackgroundType}
                    backgroundColor={headerSolidColor}
                    gradientColor={headerGradientColor}
                    textColor={headerTextColor}
                    onStickyTypeChange={updateHeaderType}
                    onBackgroundTypeChange={updateHeaderBackgroundType}
                    onBackgroundColorChange={updateHeaderSolidColor}
                    onGradientColorChange={updateHeaderGradientColor}
                    onTextColorChange={updateHeaderTextColor}
                    activeMenuTextColor={headerActiveTextColor}
                    activeMenuBackgroundColor={headerActiveBackgroundColor}
                    activeMenuStyle={headerActiveMenuStyle}
                    activeMenuKeepTextColor={headerActiveKeepTextColor}
                    activeMenuLineGap={headerActiveLineGap}
                    activeMenuPadding={headerActiveMenuPadding}
                    onActiveMenuTextColorChange={updateHeaderActiveTextColor}
                    onActiveMenuBackgroundColorChange={
                      updateHeaderActiveBackgroundColor
                    }
                    onActiveMenuStyleChange={updateHeaderActiveMenuStyle}
                    onActiveMenuKeepTextColorChange={
                      updateHeaderActiveKeepTextColor
                    }
                    onActiveMenuLineGapChange={updateHeaderActiveLineGap}
                    onActiveMenuPaddingChange={updateHeaderActiveMenuPadding}
                />
              )}

            {activeSectionType === "Header" &&
              activeTab === "Header Layout" && (
                <div className="space-y-4">
                  {layoutOptions.map((layout) => {
                    const isActive = currentSection?.variant === layout.id;
                    const liveHeaderContent = activeHeaderData
                      ? (activeHeaderData as Record<string, unknown>)
                      : null;

                    if (layout.isDatabase) {
                      return (
                        <DatabaseLayoutOptionCard
                          key={layout.id}
                          layout={layout}
                          category={category}
                          active={isActive}
                          liveContent={liveHeaderContent}
                          onSelect={() => selectSectionVariant(layout.id)}
                          editorPart={eventsEditorPart}
                        />
                      );
                    }

                    return (
                      <button
                        key={layout.id}
                        type="button"
                        onClick={() => selectSectionVariant(layout.id)}
                        className={`relative w-full overflow-hidden rounded-2xl border bg-white text-left ${
                          isActive ? "border-gray-400" : "border-gray-200"
                        }`}
                      >
                        <SelectedLayoutBadge active={isActive} />
                        <div className="h-20 bg-gray-100">
                          {layout.id === "Header-1" && (
                            <div className="h-full">
                              <div
                                className="flex h-10 items-center justify-between px-4"
                                style={{
                                  background: headerPreviewBackground,
                                  color: headerTextColor,
                                }}
                              >
                                <div className="h-2 w-14 rounded bg-current" />
                                <div className="flex gap-3">
                                  <div className="h-1.5 w-9 rounded bg-current" />
                                  <div className="h-1.5 w-9 rounded bg-current" />
                                  <div className="h-1.5 w-9 rounded bg-current" />
                                </div>
                                <div className="h-5 w-12 rounded-md bg-blue-600" />
                              </div>
                            </div>
                          )}

                          {layout.id === "Header-2" && (
                            <div
                              className="flex h-full items-start justify-between px-4 py-4"
                              style={{
                                background: headerPreviewBackground,
                                color: headerTextColor,
                              }}
                            >
                              <div className="h-2 w-16 rounded bg-current" />
                              <div className="flex gap-3">
                                <div className="h-1.5 w-9 rounded bg-current" />
                                <div className="h-1.5 w-9 rounded bg-current" />
                                <div className="h-1.5 w-9 rounded bg-current" />
                              </div>
                              <div className="h-5 w-12 rounded-md bg-blue-600" />
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

            {activeSectionType === "Banner" &&
              activeTab === "Banner Content" && (
                <div className="space-y-4">
                  <input
                    ref={bannerVideoInputRef}
                    type="file"
                    accept="video/*"
                    onChange={handleBannerVideoFileChange}
                    className="hidden"
                    aria-label="Choose banner video"
                  />

                  {isSimpleBanner &&
                  ("pretitle" in (activeBannerData ?? {}) ||
                    "title" in (activeBannerData ?? {}) ||
                    "desc" in (activeBannerData ?? {})) ? (
                    <div className="mb-1 flex items-center gap-2">
                      <span className="grid size-7 place-items-center rounded-lg bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                        <FileText size={14} />
                      </span>
                      <div>
                        <p className="text-xs font-semibold text-slate-800">
                          Hero copy
                        </p>
                        <p className="text-[10px] text-slate-500">
                          Text visitors see first on this banner.
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {isSimpleBanner && "pretitle" in (activeBannerData ?? {}) && (
                    <ContentFieldCard
                      label="Pretitle"
                      hint="Short eyebrow above the main headline"
                    >
                      <input
                        value={activeBannerData?.pretitle ?? ""}
                        onChange={(event) =>
                          updateBannerField("pretitle", event.target.value)
                        }
                        className={contentFieldInputClass}
                        placeholder="e.g. Welcome to our studio…"
                      />
                    </ContentFieldCard>
                  )}

                  {isSimpleBanner && "title" in (activeBannerData ?? {}) && (
                    <ContentFieldCard
                      label="Title"
                      hint="Main headline — keep it clear and short"
                    >
                      <input
                        value={activeBannerData?.title ?? ""}
                        onChange={(event) =>
                          updateBannerField("title", event.target.value)
                        }
                        className={contentFieldInputClass}
                        placeholder="e.g. Build your dream website…"
                      />
                    </ContentFieldCard>
                  )}

                  {isSimpleBanner && "desc" in (activeBannerData ?? {}) && (
                    <ContentFieldCard
                      label="Description"
                      hint="Supporting line under the title"
                    >
                      <textarea
                        value={activeBannerData?.desc ?? ""}
                        onChange={(event) =>
                          updateBannerField("desc", event.target.value)
                        }
                        className={contentFieldTextareaClass}
                        placeholder="Write a short line that explains your offer…"
                      />
                    </ContentFieldCard>
                  )}

                  {activeVariant === "Banner-2" &&
                    "overlayColor" in (activeBannerData ?? {}) && (
                    <div className={contentFieldCardClass}>
                        <ColorInput
                          label="Overlay color"
                          value={activeBannerData?.overlayColor ?? "#000000"}
                          onChange={(color) =>
                            updateBannerField("overlayColor", color)
                          }
                        />
                    </div>
                  )}

                  {isSliderBanner && hasBannerSlidesField && (
                    <section className={`${contentFieldCardClass} space-y-4`}>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h4 className="text-xs font-semibold text-slate-800">
                            Banner slides
                        </h4>
                          <p className="mt-0.5 text-[10px] text-slate-500">
                            Add a slide — only the open one stays unfolded.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={addBannerSlide}
                          className={contentAddButtonClass}
                        >
                          <Plus size={14} />
                          Add slide
                        </button>
                      </div>

                      {(activeBannerData?.bannerSlides ?? []).map(
                        (slide, index) => (
                          <ContentAccordionItem
                            key={index}
                            title={`Slide ${index + 1}`}
                            summary={slide.title || slide.desc || undefined}
                            open={bannerSlideAccordion.expandedIndex === index}
                            onToggle={() =>
                              bannerSlideAccordion.toggleIndex(index)
                            }
                            onDelete={() => deleteBannerSlide(index)}
                            deleteAriaLabel="Delete banner slide"
                            itemRef={(node) =>
                              bannerSlideAccordion.setItemRef(index, node)
                            }
                          >
                            {!isVideoSliderBanner && (
                              <div>
                                <label className={contentFieldLabelClass}>
                                  Slide image
                                </label>
                                <div className="mt-2">
                                  <ContentMediaPickButton
                                    hasFile={Boolean(slide.image)}
                                    mediaKind="image"
                                    fileLabel={getMediaUploadLabel(
                                      slide.image,
                                      "image",
                                    )}
                                    onClick={() =>
                                      openImagePicker(
                                        `Slide ${index + 1} Image`,
                                        slide.image,
                                        (source, fileName) => {
                                          updateBannerSlide(index, "image", source);
                                          if (!slide.alt)
                                            updateBannerSlide(index, "alt", fileName);
                                        },
                                      )
                                    }
                                  />
                                </div>
                              </div>
                            )}

                            {isVideoSliderBanner && (
                              <div>
                                <div className="flex items-center justify-between gap-3">
                                  <label className={contentFieldLabelClass}>
                                    Slide video
                                  </label>
                                  {slide.video && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        deleteBannerSlideVideo(index)
                                      }
                                      className="rounded-lg border border-red-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-red-600 transition hover:bg-red-50"
                                    >
                                      Delete video
                                    </button>
                                  )}
                                </div>
                                <div className="mt-2">
                                  <ContentMediaPickButton
                                    hasFile={Boolean(slide.video)}
                                    mediaKind="video"
                                    fileLabel={getMediaUploadLabel(
                                      slide.video ?? "",
                                      "video",
                                    )}
                                  >
                                  <input
                                    type="file"
                                    accept="video/*"
                                    onChange={(event) =>
                                      handleBannerSlideVideoFileChange(
                                        index,
                                        event,
                                      )
                                    }
                                      className="absolute inset-0 cursor-pointer opacity-0"
                                    aria-label={`Choose slide ${index + 1} video`}
                                  />
                                  </ContentMediaPickButton>
                                </div>
                              </div>
                            )}

                            {isVideoSliderBanner && (
                              <div>
                                <label className={contentFieldLabelClass}>
                                  Poster image
                                </label>
                                <div className="mt-2">
                                  <ContentMediaPickButton
                                    hasFile={Boolean(slide.image)}
                                    mediaKind="image"
                                    fileLabel={getMediaUploadLabel(
                                      slide.image,
                                      "image",
                                    )}
                                    onClick={() =>
                                      openImagePicker(
                                        `Slide ${index + 1} Poster Image`,
                                        slide.image,
                                        (source, fileName) => {
                                          updateBannerSlide(index, "image", source);
                                          if (!slide.alt)
                                            updateBannerSlide(index, "alt", fileName);
                                        },
                                      )
                                    }
                                  />
                                </div>
                                <input
                                  value={slide.image}
                                  onChange={(event) =>
                                    updateBannerSlide(
                                      index,
                                      "image",
                                      event.target.value,
                                    )
                                  }
                                  className={contentFieldInputClass}
                                  placeholder="Or paste poster image URL…"
                                />
                              </div>
                            )}

                            <div>
                              <label className={contentFieldLabelClass}>
                                Image alt text
                              </label>
                              <input
                                value={slide.alt ?? ""}
                                onChange={(event) =>
                                  updateBannerSlide(
                                    index,
                                    "alt",
                                    event.target.value,
                                  )
                                }
                                className={contentFieldInputClass}
                                placeholder="Describe this slide image…"
                              />
                            </div>

                            {activeVariant === "Banner-5" && (
                            <div>
                              <label className={contentFieldLabelClass}>
                                Pretitle
                              </label>
                              <input
                                value={
                                  slide.pretitle ??
                                  activeBannerData?.pretitle ??
                                  ""
                                }
                                onChange={(event) =>
                                  updateBannerSlide(
                                    index,
                                    "pretitle",
                                    event.target.value,
                                  )
                                }
                                className={contentFieldInputClass}
                                placeholder="Short line above the title…"
                              />
                            </div>
                            )}

                            <div>
                              <label className={contentFieldLabelClass}>
                                Slide title
                              </label>
                              <input
                                value={slide.title}
                                onChange={(event) =>
                                  updateBannerSlide(
                                    index,
                                    "title",
                                    event.target.value,
                                  )
                                }
                                className={contentFieldInputClass}
                                placeholder="Headline for this slide…"
                              />
                            </div>

                            <div>
                              <label className={contentFieldLabelClass}>
                                Slide description
                              </label>
                              <textarea
                                value={slide.desc ?? ""}
                                onChange={(event) =>
                                  updateBannerSlide(
                                    index,
                                    "desc",
                                    event.target.value,
                                  )
                                }
                                className={contentFieldTextareaClass}
                                placeholder="Short supporting text for this slide…"
                              />
                            </div>

                            <div className="space-y-3">
                              <div className="flex items-center justify-between gap-3">
                              <div>
                                  <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-500">
                                    Slide buttons
                                  </p>
                                  <p className="mt-0.5 text-[10px] text-slate-500">
                                    {getBannerSlideButtons(slide).length}/
                                    {MAX_BANNER_BUTTONS} buttons
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => addBannerSlideButton(index)}
                                  disabled={
                                    getBannerSlideButtons(slide).length >=
                                    MAX_BANNER_BUTTONS
                                  }
                                  className={`${contentAddButtonClass} disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none`}
                                >
                                  <Plus size={14} />
                                  Add button
                                </button>
                              </div>

                              {getBannerSlideButtons(slide).map((button, buttonIndex) => (
                                <div
                                  key={`slide-${index}-button-${buttonIndex}`}
                                  className="rounded-xl border border-slate-200/80 bg-white p-3.5"
                                >
                                  <div className="mb-2 flex items-center justify-between gap-2">
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-500">
                                      Button {buttonIndex + 1}
                                    </p>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        deleteBannerSlideButton(index, buttonIndex)
                                      }
                                      className="rounded-lg border border-red-200 bg-white px-2 py-1 text-[11px] font-semibold text-red-600 transition hover:bg-red-50"
                                      aria-label={`Delete slide ${index + 1} button ${buttonIndex + 1}`}
                                    >
                                      Remove
                                    </button>
                                  </div>
                              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                              <div>
                                <label className={contentFieldLabelClass}>
                                  Label
                                </label>
                                <input
                                  value={button.label ?? ""}
                                  onChange={(event) =>
                                    updateBannerSlideButton(
                                      index,
                                      buttonIndex,
                                      "label",
                                      event.target.value,
                                    )
                                  }
                                  className={contentFieldInputClass}
                                  placeholder="e.g. Book a call"
                                />
                              </div>

                              <div>
                                <label className={contentFieldLabelClass}>
                                  Link
                                </label>
                                <HrefDestinationButton
                                  value={button.href ?? ""}
                                  onClick={() =>
                                    openBannerSlideButtonHrefPicker(
                                      index,
                                      buttonIndex,
                                    )
                                  }
                                  className="mt-1.5 h-9"
                                />
                              </div>

                              <div>
                                <label className={contentFieldLabelClass}>
                                  Style
                                </label>
                                <select
                                  value={button.variant ?? (buttonIndex === 0 ? "primary" : "secondary")}
                                  onChange={(event) =>
                                    updateBannerSlideButton(
                                      index,
                                      buttonIndex,
                                      "variant",
                                      event.target.value,
                                    )
                                  }
                                  className={contentFieldInputClass}
                                >
                                  <option value="primary">Primary</option>
                                  <option value="secondary">Secondary</option>
                                </select>
                              </div>
                              <div>
                                <label className={contentFieldLabelClass}>
                                  Icon
                                </label>
                                <select
                                  value={button.icon ?? "none"}
                                  onChange={(event) =>
                                    updateBannerSlideButton(
                                      index,
                                      buttonIndex,
                                      "icon",
                                      event.target.value,
                                    )
                                  }
                                  className={contentFieldInputClass}
                                >
                                  <option value="none">No icon</option>
                                  <option value="arrow-right">Arrow right</option>
                                  <option value="arrow-left">Arrow left</option>
                                  <option value="plus">Plus</option>
                                  <option value="phone">Phone</option>
                                  <option value="mail">Mail</option>
                                  <option value="external-link">External link</option>
                                </select>
                            </div>
                              <div>
                                <label className={contentFieldLabelClass}>
                                  Icon position
                                </label>
                                <select
                                  value={button.iconPosition ?? "after"}
                                  onChange={(event) =>
                                    updateBannerSlideButton(
                                      index,
                                      buttonIndex,
                                      "iconPosition",
                                      event.target.value,
                                    )
                                  }
                                  className={contentFieldInputClass}
                                >
                                  <option value="before">Before text</option>
                                  <option value="after">After text</option>
                                </select>
                          </div>
                              <label className="mt-7 flex h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 text-xs text-slate-700">
                                <input
                                  type="checkbox"
                                  checked={button.openInNewTab === true}
                                  onChange={(event) =>
                                    updateBannerSlideButton(
                                      index,
                                      buttonIndex,
                                      "openInNewTab",
                                      event.target.checked,
                                    )
                                  }
                                  className="size-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500/30"
                                />
                                Open in new tab
                              </label>
                              </div>
                                </div>
                              ))}
                            </div>
                          </ContentAccordionItem>
                        ),
                      )}
                    </section>
                  )}

                  {isSimpleBanner && hasBannerMediaField && (
                    <section className={contentFieldCardClass}>
                      <div className="mb-1">
                        <h4 className="text-xs font-semibold text-slate-800">
                          Banner media
                      </h4>
                        <p className="mt-0.5 text-[10px] text-slate-500">
                          Background image or video for this hero.
                        </p>
                      </div>

                      {hasBannerImageField && (
                        <div className="mt-4 grid gap-4 lg:grid-cols-2">
                          <div>
                            <label className={contentFieldLabelClass}>
                              Background image
                            </label>
                            <div className="mt-2 grid gap-3 sm:grid-cols-[minmax(0,1fr)_9rem] sm:items-start">
                              <ContentMediaPickButton
                                hasFile={Boolean(
                                  activeBannerData?.backgroundImage,
                                )}
                                mediaKind="image"
                                fileLabel={getMediaUploadLabel(
                                    activeBannerData?.backgroundImage ?? "",
                                    "image",
                                  )}
                                onClick={() =>
                                  openImagePicker(
                                    "Banner Background Image",
                                    activeBannerData?.backgroundImage ?? "",
                                    (source, fileName) =>
                                      updateActiveBannerData({
                                        bannerBackgroundMode: "image",
                                        backgroundImage: source,
                                        backgroundImageTitle:
                                          activeBannerData?.backgroundImageTitle ||
                                          fileName,
                                      }),
                                  )
                                }
                              />
                              <MediaUploadPreview
                                src={activeBannerData?.backgroundImage ?? ""}
                                type="image"
                              />
                            </div>
                          </div>

                          <div>
                            <label className={contentFieldLabelClass}>
                              Image alt text
                            </label>
                            <input
                              value={
                                activeBannerData?.backgroundImageTitle ?? ""
                              }
                              onChange={(event) =>
                                updateBannerField(
                                  "backgroundImageTitle",
                                  event.target.value,
                                )
                              }
                              className={contentFieldInputClass}
                              placeholder="Describe the background image…"
                            />
                          </div>
                        </div>
                      )}

                      {hasBannerVideoField && (
                        <div className="mt-4">
                          <div className="flex items-center justify-between gap-3">
                            <label className={contentFieldLabelClass}>
                              Background video
                            </label>
                            {activeBannerData?.backgroundVideo && (
                              <button
                                type="button"
                                onClick={() =>
                                  updateBannerField("backgroundVideo", "")
                                }
                                className="rounded-lg border border-red-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-red-600 transition hover:bg-red-50"
                              >
                                Delete video
                              </button>
                            )}
                          </div>
                          <div className="mt-2 grid gap-3 sm:grid-cols-[minmax(0,1fr)_9rem] sm:items-start">
                            <ContentMediaPickButton
                              hasFile={Boolean(
                                activeBannerData?.backgroundVideo,
                              )}
                              mediaKind="video"
                              fileLabel={getMediaUploadLabel(
                                  activeBannerData?.backgroundVideo ?? "",
                                  "video",
                                )}
                              onClick={() =>
                                bannerVideoInputRef.current?.click()
                              }
                            />
                            <MediaUploadPreview
                              src={activeBannerData?.backgroundVideo ?? ""}
                              type="video"
                            />
                          </div>
                        </div>
                      )}

                      {hasBannerColorField && (
                        <div className="mt-4 grid gap-4 lg:grid-cols-2">
                          <ColorInput
                            label={
                              bannerBackgroundMode === "gradient"
                                ? "Background left"
                                : "Background color"
                            }
                            value={bannerSolidColor}
                            onChange={(color) =>
                              updateBannerField("bannerBackgroundColor", color)
                            }
                          />

                          {bannerBackgroundMode === "gradient" && (
                            <ColorInput
                              label="Background right"
                              value={bannerGradientColor}
                              onChange={(color) =>
                                updateBannerField("bannerGradientColor", color)
                              }
                            />
                          )}
                        </div>
                      )}
                    </section>
                  )}

                  {hasBannerHeightField && (
                    <div className={contentFieldCardClass}>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <label className="text-xs font-semibold text-slate-800">
                            Banner height
                        </label>
                          <p className="mt-0.5 text-[10px] text-slate-500">
                            Viewport height for this hero ({bannerHeight}vh)
                          </p>
                        </div>
                        <input
                          type="number"
                          min={40}
                          max={100}
                          value={bannerHeight}
                          onChange={(event) =>
                            updateBannerHeight(Number(event.target.value))
                          }
                          className="h-10 w-24 rounded-xl border border-slate-200 bg-slate-50/80 px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/15"
                        />
                      </div>
                      <input
                        type="range"
                        min={40}
                        max={100}
                        value={bannerHeight}
                        onChange={(event) =>
                          updateBannerHeight(Number(event.target.value))
                        }
                        className="mt-4 w-full accent-[#315ff4]"
                      />
                    </div>
                  )}

                  {isSimpleBanner && hasBannerButtonsField && (
                    <div className={`${contentFieldCardClass} space-y-4`}>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h4 className="text-xs font-semibold text-slate-800">
                            Banner buttons
                        </h4>
                          <p className="mt-0.5 text-[10px] text-slate-500">
                            {(activeBannerData?.buttons ?? []).length}/
                            {MAX_BANNER_BUTTONS} CTAs added
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={addBannerButton}
                          disabled={
                            (activeBannerData?.buttons ?? []).length >=
                            MAX_BANNER_BUTTONS
                          }
                          className={`${contentAddButtonClass} disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none`}
                        >
                          <Plus size={14} />
                          Add button
                        </button>
                      </div>

                      <div className="space-y-3">
                        {(activeBannerData?.buttons ?? []).map(
                          (button, index) => (
                            <ContentAccordionItem
                              key={index}
                              title={`Button ${index + 1}`}
                              summary={button.label || undefined}
                              open={
                                bannerButtonAccordion.expandedIndex === index
                              }
                              onToggle={() =>
                                bannerButtonAccordion.toggleIndex(index)
                              }
                              onDelete={() => deleteBannerButton(index)}
                              deleteAriaLabel="Delete banner button"
                              itemRef={(node) =>
                                bannerButtonAccordion.setItemRef(index, node)
                              }
                            >
                              <div className="grid gap-3 sm:grid-cols-2">
                                <div>
                                  <label className={contentFieldLabelClass}>
                                    Label
                                  </label>
                              <input
                                value={button.label}
                                onChange={(event) =>
                                  updateBannerButton(
                                    index,
                                    "label",
                                    event.target.value,
                                  )
                                }
                                    className={contentFieldInputClass}
                                    placeholder="e.g. Get started"
                                  />
                                </div>
                                <div>
                                  <label className={contentFieldLabelClass}>
                                    Link
                                  </label>
                                  <HrefDestinationButton
                                value={button.href}
                                    onClick={() =>
                                      openBannerButtonHrefPicker(index)
                                    }
                                    className="mt-1.5 h-9"
                                  />
                                </div>
                              </div>

                              <div className="grid gap-3 sm:grid-cols-3">
                                <div>
                                  <label className={contentFieldLabelClass}>
                                    Style
                                  </label>
                              <select
                                value={button.variant ?? "primary"}
                                onChange={(event) =>
                                  updateBannerButton(
                                    index,
                                    "variant",
                                    event.target.value,
                                  )
                                }
                                    className={contentFieldInputClass}
                                aria-label="Banner button style"
                              >
                                <option value="primary">Primary</option>
                                <option value="secondary">Secondary</option>
                              </select>
                                </div>
                                <div>
                                  <label className={contentFieldLabelClass}>
                                    Icon
                                  </label>
                                  <select
                                    value={button.icon ?? "none"}
                                    onChange={(event) =>
                                      updateBannerButton(
                                        index,
                                        "icon",
                                        event.target.value,
                                      )
                                    }
                                    className={contentFieldInputClass}
                                    aria-label="Banner button icon"
                                  >
                                    <option value="none">No icon</option>
                                    <option value="arrow-right">Arrow right</option>
                                    <option value="arrow-left">Arrow left</option>
                                    <option value="plus">Plus</option>
                                    <option value="phone">Phone</option>
                                    <option value="mail">Mail</option>
                                    <option value="external-link">
                                      External link
                                    </option>
                                  </select>
                            </div>
                                <div>
                                  <label className={contentFieldLabelClass}>
                                    Icon position
                                  </label>
                                  <select
                                    value={button.iconPosition ?? "after"}
                                    onChange={(event) =>
                                      updateBannerButton(
                                        index,
                                        "iconPosition",
                                        event.target.value,
                                      )
                                    }
                                    className={contentFieldInputClass}
                                    aria-label="Banner button icon position"
                                  >
                                    <option value="before">Icon before</option>
                                    <option value="after">Icon after</option>
                                  </select>
                                </div>
                              </div>

                              <label className="inline-flex h-9 max-w-full items-center gap-2 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700">
                                <input
                                  type="checkbox"
                                  checked={button.openInNewTab === true}
                                  onChange={(event) =>
                                    updateBannerButton(
                                      index,
                                      "openInNewTab",
                                      event.target.checked,
                                    )
                                  }
                                  className="size-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500/30"
                                />
                                Open in new tab
                              </label>
                            </ContentAccordionItem>
                          ),
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

            {activeSectionType === "Banner" &&
              activeTab === "Banner Layout" && (
                <div className="space-y-4">
                  {layoutOptions.map((layout) => {
                    const isActive = currentSection?.variant === layout.id;

                    if (layout.isDatabase) {
                      return (
                        <DatabaseLayoutOptionCard
                          key={layout.id}
                          layout={layout}
                          category={category}
                          active={isActive}
                          onSelect={() => selectSectionVariant(layout.id)}
                          editorPart={eventsEditorPart}
                        />
                      );
                    }

                    return (
                      <button
                        key={layout.id}
                        type="button"
                        onClick={() => selectSectionVariant(layout.id)}
                        className={`relative w-full overflow-hidden rounded-2xl border bg-white text-left ${
                          isActive ? "border-gray-400" : "border-gray-200"
                        }`}
                      >
                        <SelectedLayoutBadge active={isActive} />
                        <div className="h-28 bg-gray-100">
                          {layout.id === "Banner-1" && (
                            <div className="relative flex h-full items-center overflow-hidden bg-slate-900 px-5">
                              <div
                                className="absolute inset-0 bg-cover bg-center"
                                style={{
                                  backgroundImage: `url(${
                                    activeBannerData?.backgroundImage ??
                                    "/bg1.jpg"
                                  })`,
                                }}
                              />
                              <div className="absolute inset-0 bg-black/45" />
                              <div className="relative z-10 w-2/3 space-y-2">
                                <span className="rounded bg-white/90 px-2 py-0.5 text-[10px] font-bold text-slate-950">
                                  Image Banner
                                </span>
                                <div className="h-1.5 w-24 rounded bg-white/70" />
                                <div className="h-3 w-40 rounded bg-white" />
                                <div className="h-1.5 w-full rounded bg-white/60" />
                                <div className="h-1.5 w-4/5 rounded bg-white/60" />
                                <div className="h-5 w-16 rounded-md bg-blue-600" />
                              </div>
                            </div>
                          )}

                          {layout.id === "Banner-2" && (
                            <div className="relative flex h-full items-center justify-center overflow-hidden bg-slate-950 px-5 text-center">
                              <video
                                className="absolute inset-0 h-full w-full object-cover opacity-70"
                                src={activeBannerData?.backgroundVideo || "/video.mp4"}
                                muted
                                loop
                                playsInline
                              />
                              <div className="absolute inset-0 bg-black/45" />
                              <div className="relative z-10 w-2/3 space-y-3">
                                <span className="rounded bg-white/90 px-2 py-0.5 text-[10px] font-bold text-slate-950">
                                  Video Banner
                                </span>
                                <div className="mx-auto h-4 w-40 rounded bg-white" />
                                <div className="mx-auto h-2 w-full rounded bg-white/70" />
                                <div className="mx-auto h-2 w-4/5 rounded bg-white/70" />
                                <div className="mx-auto h-6 w-20 rounded-md bg-blue-600" />
                              </div>
                            </div>
                          )}

                          {layout.id === "Banner-3" && (
                            <div className="relative flex h-full items-center overflow-hidden bg-slate-900 px-5">
                              <div
                                className="absolute inset-0 bg-cover bg-center"
                                style={{
                                  backgroundImage: `url(${
                                    activeBannerData?.bannerSlides?.[0]
                                      ?.image ?? "/bg2.jpg"
                                  })`,
                                }}
                              />
                              <div className="absolute inset-0 bg-black/45" />
                              <div className="relative z-10 w-2/3 space-y-2">
                                <span className="rounded bg-white/90 px-2 py-0.5 text-[10px] font-bold text-slate-950">
                                  Image Slider
                                </span>
                                <div className="h-3 w-44 rounded bg-white" />
                                <div className="h-1.5 w-full rounded bg-white/60" />
                                <div className="h-1.5 w-4/5 rounded bg-white/60" />
                                <div className="h-5 w-20 rounded-md bg-blue-600" />
                              </div>
                              <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1">
                                <span className="h-1.5 w-6 rounded bg-white" />
                                <span className="h-1.5 w-1.5 rounded bg-white/50" />
                                <span className="h-1.5 w-1.5 rounded bg-white/50" />
                              </div>
                            </div>
                          )}

                          {layout.id === "Banner-4" && (
                            <div className="relative flex h-full items-center overflow-hidden bg-slate-900 px-5">
                              <video
                                className="absolute inset-0 h-full w-full object-cover opacity-70"
                                src={
                                  activeBannerData?.bannerSlides?.[0]?.video ||
                                  "/video.mp4"
                                }
                                poster={
                                  activeBannerData?.bannerSlides?.[0]?.image ||
                                  "/bg1.jpg"
                                }
                                muted
                                loop
                                playsInline
                              />
                              <div className="absolute inset-0 bg-black/45" />
                              <div className="relative z-10 w-2/3 space-y-2">
                                <span className="rounded bg-white/90 px-2 py-0.5 text-[10px] font-bold text-slate-950">
                                  Video Slider
                                </span>
                                <div className="h-3 w-44 rounded bg-white" />
                                <div className="h-1.5 w-full rounded bg-white/60" />
                                <div className="h-1.5 w-4/5 rounded bg-white/60" />
                                <div className="h-5 w-20 rounded-md bg-blue-600" />
                              </div>
                              <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1">
                                <span className="h-1.5 w-6 rounded bg-white" />
                                <span className="h-1.5 w-1.5 rounded bg-white/50" />
                                <span className="h-1.5 w-1.5 rounded bg-white/50" />
                              </div>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

            {activeSectionType === "About" && activeTab === "About Layout" && (
              <div className="space-y-4">
                {activeAboutLayouts.map((layout) => {
                  const isActive = currentSection?.variant === layout.id;

                  if (layout.isDatabase) {
                    return (
                      <DatabaseLayoutOptionCard
                        key={layout.id}
                        layout={layout}
                        category={category}
                        active={isActive}
                        onSelect={() => selectSectionVariant(layout.id)}
                        editorPart={eventsEditorPart}
                      />
                    );
                  }

                  return (
                    <button
                      key={layout.id}
                      type="button"
                      onClick={() => selectSectionVariant(layout.id)}
                      className={`relative w-full overflow-hidden rounded-2xl border bg-white text-left ${
                        isActive ? "border-gray-400" : "border-gray-200"
                      }`}
                    >
                      <SelectedLayoutBadge active={isActive} />
                      <div className="h-32 bg-gray-100">
                        {layout.id === "AboutPage-1" && (
                          <div className="grid h-full grid-cols-[1.1fr_0.9fr] gap-3 bg-white p-4">
                            <div className="space-y-2">
                              <div className="h-2 w-20 rounded bg-blue-500" />
                              <div className="h-5 w-full rounded bg-slate-900" />
                              <div className="h-5 w-4/5 rounded bg-slate-900" />
                              <div className="mt-3 h-2 w-full rounded bg-slate-400" />
                              <div className="h-2 w-5/6 rounded bg-slate-400" />
                            </div>
                            <div className="rounded-2xl bg-slate-300" />
                          </div>
                        )}

                        {layout.id === "AboutPage-2" && (
                          <div className="grid h-full grid-cols-[0.9fr_1.1fr] gap-3 bg-slate-50 p-4">
                            <div className="rounded-2xl bg-slate-300" />
                            <div className="space-y-2">
                              <div className="h-2 w-20 rounded bg-blue-500" />
                              <div className="h-5 w-full rounded bg-slate-900" />
                              <div className="h-5 w-4/5 rounded bg-slate-900" />
                              <div className="mt-3 grid grid-cols-3 gap-2">
                                <div className="h-8 rounded bg-white" />
                                <div className="h-8 rounded bg-white" />
                                <div className="h-8 rounded bg-white" />
                              </div>
                            </div>
                          </div>
                        )}

                        {layout.id === "AboutPage-3" && (
                          <div className="h-full bg-slate-950 p-4">
                            <div className="h-2 w-20 rounded bg-blue-300" />
                            <div className="mt-3 grid grid-cols-[1.1fr_0.9fr] gap-4">
                              <div className="space-y-2">
                                <div className="h-5 w-full rounded bg-white" />
                                <div className="h-5 w-4/5 rounded bg-white" />
                              </div>
                              <div className="space-y-2">
                                <div className="h-2 w-full rounded bg-white/50" />
                                <div className="h-2 w-5/6 rounded bg-white/50" />
                              </div>
                            </div>
                            <div className="mt-4 grid grid-cols-3 gap-2">
                              <div className="h-7 rounded bg-white/10" />
                              <div className="h-7 rounded bg-white/10" />
                              <div className="h-7 rounded bg-white/10" />
                            </div>
                          </div>
                        )}

                        {layout.id === "About-1" && (
                          <div className="grid h-full grid-cols-2 overflow-hidden bg-[#fbfaf6]">
                            <div className="flex flex-col justify-center gap-2 px-5">
                              <div className="h-4 w-24 rounded bg-slate-900" />
                              <div className="h-2 w-full rounded bg-slate-400" />
                              <div className="h-2 w-4/5 rounded bg-slate-400" />
                              <div className="h-5 w-20 rounded-full bg-blue-600" />
                            </div>
                            <div className="bg-slate-300" />
                          </div>
                        )}

                        {layout.id === "About-2" && (
                          <div className="grid h-full grid-cols-[1fr_1.4fr_1fr] gap-3 bg-white p-4">
                            <div className="space-y-2">
                              <div className="h-5 w-16 rounded bg-slate-900" />
                              <div className="h-5 w-12 rounded bg-slate-900" />
                              <div className="mt-4 h-2 w-20 rounded bg-slate-500" />
                              <div className="h-2 w-24 rounded bg-slate-400" />
                            </div>
                            <div className="rounded-2xl bg-slate-300" />
                            <div className="space-y-3">
                              <div className="h-12 rounded-2xl bg-slate-300" />
                              <div className="h-3 w-20 rounded bg-slate-900" />
                              <div className="h-2 w-full rounded bg-slate-400" />
                              <div className="h-2 w-4/5 rounded bg-slate-400" />
                            </div>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {activeSectionType === "Product" &&
              activeTab === "Product Layout" && (
                <div className="space-y-4">
                  {layoutOptions.map((layout) => {
                    const isActive = currentSection?.variant === layout.id;

                    if (layout.isDatabase) {
                      return (
                        <DatabaseLayoutOptionCard
                          key={layout.id}
                          layout={layout}
                          category={category}
                          active={isActive}
                          onSelect={() => selectSectionVariant(layout.id)}
                          editorPart={eventsEditorPart}
                        />
                      );
                    }

                    return (
                      <button
                        key={layout.id}
                        type="button"
                        onClick={() => selectSectionVariant(layout.id)}
                        className={`relative w-full overflow-hidden rounded-2xl border bg-white text-left ${
                          isActive ? "border-gray-400" : "border-gray-200"
                        }`}
                      >
                        <SelectedLayoutBadge active={isActive} />
                        <div className="h-32 bg-gray-100">
                          {layout.id === "Product-1" && (
                            <div className="grid h-full grid-cols-[1fr_1.4fr_1fr] items-center gap-3 bg-blue-50 px-5">
                              <div className="space-y-2">
                                <div className="h-4 w-20 rounded bg-slate-900" />
                                <div className="h-2 w-16 rounded bg-slate-500" />
                                <div className="mt-4 h-16 rounded bg-white shadow-sm" />
                              </div>
                              <div className="mx-auto h-24 w-24 rounded-full bg-slate-300" />
                              <div className="space-y-2">
                                <div className="h-4 w-24 rounded bg-slate-900" />
                                <div className="h-2 w-full rounded bg-slate-400" />
                                <div className="h-2 w-4/5 rounded bg-slate-400" />
                              </div>
                            </div>
                          )}

                          {layout.id === "Product-2" && (
                            <div className="h-full bg-sky-100 p-4">
                              <div className="mx-auto mb-3 h-4 w-32 rounded bg-slate-900" />
                              <div className="grid h-20 grid-cols-3 gap-3">
                                <div className="rounded-lg border border-slate-400 bg-sky-50" />
                                <div className="rounded-lg border border-slate-400 bg-sky-50" />
                                <div className="rounded-lg border border-slate-400 bg-sky-50" />
                              </div>
                            </div>
                          )}

                          {layout.id === "Product-3" && (
                            <div className="grid h-full grid-cols-[1fr_1.1fr] gap-4 bg-[#0d1f2a] p-4">
                              <div className="space-y-2">
                                <div className="h-2 w-16 rounded bg-blue-200" />
                                <div className="h-5 w-full rounded bg-white" />
                                <div className="h-5 w-4/5 rounded bg-white" />
                                <div className="mt-3 h-3 w-24 rounded bg-blue-600" />
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="rounded-lg bg-white/25" />
                                <div className="rounded-lg bg-white/25" />
                                <div className="rounded-lg bg-white/25" />
                                <div className="rounded-lg bg-white/25" />
                              </div>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

            {activeSectionType === "FormDetail" &&
              activeTab === "Form Layout" && (
                <div className="space-y-4">
                  {layoutOptions.map((layout) => {
                    const isActive = currentSection?.variant === layout.id;

                    if (layout.isDatabase) {
                      return (
                        <DatabaseLayoutOptionCard
                          key={layout.id}
                          layout={layout}
                          category={category}
                          active={isActive}
                          onSelect={() => selectSectionVariant(layout.id)}
                          editorPart={eventsEditorPart}
                        />
                      );
                    }

                    return (
                      <button
                        key={layout.id}
                        type="button"
                        onClick={() => selectSectionVariant(layout.id)}
                        className={`relative w-full overflow-hidden rounded-2xl border bg-white text-left ${
                          isActive ? "border-gray-400" : "border-gray-200"
                        }`}
                      >
                        <SelectedLayoutBadge active={isActive} />
                        <div className="grid h-32 grid-cols-[1fr_1fr] overflow-hidden bg-[#dfecea] p-3">
                          {layout.id === "FormDetail-1" ? (
                            <>
                              <div className="rounded-2xl bg-slate-900/85 p-4">
                                <div className="h-5 w-16 rounded-full bg-white/30" />
                                <div className="mt-8 h-3 w-24 rounded bg-white" />
                                <div className="mt-2 h-2 w-28 rounded bg-white/60" />
                              </div>
                              <div className="rounded-r-2xl bg-white p-4">
                                <div className="h-4 w-16 rounded bg-slate-900" />
                                <div className="mt-4 space-y-2">
                                  <div className="h-4 rounded-full bg-emerald-50" />
                                  <div className="h-4 rounded-full bg-emerald-50" />
                                  <div className="h-4 rounded-full bg-emerald-50" />
                                </div>
                                <div className="mt-3 h-5 rounded-full bg-emerald-800" />
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="bg-slate-100 p-4">
                                <div className="h-4 w-24 rounded bg-slate-900" />
                                <div className="mt-3 h-2 w-full rounded bg-slate-400" />
                                <div className="mt-2 h-2 w-4/5 rounded bg-slate-400" />
                              </div>
                              <div className="bg-white p-4">
                                <div className="space-y-2">
                                  <div className="h-5 rounded bg-slate-100" />
                                  <div className="h-5 rounded bg-slate-100" />
                                  <div className="h-8 rounded bg-blue-600" />
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                        <div className="px-4 py-3 text-sm font-semibold text-slate-800">
                          {layout.name}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

            {activeSectionType === "FormDetail" &&
              activeTab === "Form Content" && (
                <div className="space-y-5">
                  <section className={`${contentFieldCardClass} space-y-4`}>
                    <div className="flex items-center gap-2">
                      <span className="grid size-7 place-items-center rounded-lg bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                        <FileText size={14} />
                      </span>
                      <div>
                        <p className="text-xs font-semibold text-slate-800">
                          Form copy
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Title and description above the form.
                        </p>
                      </div>
                    </div>
                    <div className="grid gap-3">
                      {isContentFieldVisible("pretitle") && (
                        <div>
                          <label className={contentFieldLabelClass}>Pretitle</label>
                        <input
                          value={activeFormDetailData?.pretitle ?? ""}
                          onChange={(event) =>
                            updateActiveFormDetailData({
                              pretitle: event.target.value,
                            })
                          }
                            className={contentFieldInputClass}
                            placeholder="Short line above the form title…"
                        />
                        </div>
                      )}
                      {isContentFieldVisible("title") && (
                        <div>
                          <label className={contentFieldLabelClass}>Title</label>
                        <input
                          value={activeFormDetailData?.title ?? ""}
                          onChange={(event) =>
                            updateActiveFormDetailData({
                              title: event.target.value,
                            })
                          }
                            className={contentFieldInputClass}
                            placeholder="e.g. Get in touch"
                        />
                        </div>
                      )}
                      {isContentFieldVisible("desc") && (
                        <div>
                          <label className={contentFieldLabelClass}>Description</label>
                        <textarea
                          value={activeFormDetailData?.desc ?? ""}
                          onChange={(event) =>
                            updateActiveFormDetailData({
                              desc: event.target.value,
                            })
                          }
                            className={contentFieldTextareaClass}
                            placeholder="Tell visitors why they should fill this form…"
                        />
                        </div>
                      )}
                      {isContentFieldVisible("formSubmitLabel") && (
                        <div>
                          <label className={contentFieldLabelClass}>Submit label</label>
                        <input
                          value={activeFormDetailData?.formSubmitLabel ?? ""}
                          onChange={(event) =>
                            updateActiveFormDetailData({
                              formSubmitLabel: event.target.value,
                            })
                          }
                            className={contentFieldInputClass}
                            placeholder="e.g. Send message"
                        />
                        </div>
                      )}
                    </div>
                  </section>

                  <section className={`${contentFieldCardClass} space-y-4`}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h4 className="text-xs font-semibold text-slate-800">
                          Form fields
                      </h4>
                        <p className="mt-0.5 text-[10px] text-slate-500">
                          {(activeFormDetailData?.formFields ?? []).length}/
                          {MAX_FORM_FIELDS} fields added
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={addFormField}
                        disabled={
                          (activeFormDetailData?.formFields ?? []).length >=
                          MAX_FORM_FIELDS
                        }
                        className={`${contentAddButtonClass} disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none`}
                      >
                        <Plus size={14} />
                        Add field
                      </button>
                    </div>

                    <div className="space-y-3">
                      {(activeFormDetailData?.formFields ?? []).map(
                        (field, index) => (
                          <ContentAccordionItem
                            key={`${field.label}-${index}`}
                            title={`Field ${index + 1}`}
                            summary={
                              field.label
                                ? `${field.label} · ${field.type ?? "text"}`
                                : field.type ?? "text"
                            }
                            open={formFieldAccordion.expandedIndex === index}
                            onToggle={() =>
                              formFieldAccordion.toggleIndex(index)
                            }
                            onDelete={() => deleteFormField(index)}
                            deleteAriaLabel="Delete form field"
                            itemRef={(node) =>
                              formFieldAccordion.setItemRef(index, node)
                            }
                          >
                            <div className="grid gap-3 md:grid-cols-3">
                              <div>
                                <label className={contentFieldLabelClass}>
                                  Label
                                </label>
                              <input
                                value={field.label}
                                onChange={(event) =>
                                  updateFormField(
                                    index,
                                    "label",
                                    event.target.value,
                                  )
                                }
                                  className={contentFieldInputClass}
                                  placeholder="e.g. Full name"
                              />
                              </div>
                              <div>
                                <label className={contentFieldLabelClass}>
                                  Placeholder
                                </label>
                              <input
                                value={field.placeholder ?? ""}
                                onChange={(event) =>
                                  updateFormField(
                                    index,
                                    "placeholder",
                                    event.target.value,
                                  )
                                }
                                  className={contentFieldInputClass}
                                  placeholder="Hint inside the field…"
                              />
                              </div>
                              <div>
                                <label className={contentFieldLabelClass}>
                                  Type
                                </label>
                              <select
                                value={field.type ?? "text"}
                                onChange={(event) =>
                                  updateFormField(
                                    index,
                                    "type",
                                    event.target.value,
                                  )
                                }
                                  className={contentFieldInputClass}
                              >
                                <option value="text">Text</option>
                                <option value="email">Email</option>
                                <option value="tel">Phone</option>
                                <option value="textarea">Textarea</option>
                              </select>
                            </div>
                          </div>
                          </ContentAccordionItem>
                        ),
                      )}
                    </div>
                  </section>
                </div>
              )}

            {(
              ([
              "Breadcrumb",
              "About",
              "Service",
              "Product",
              "WhyChooseUs",
              "Features",
              "FeaturedDev",
              "InvestmentOpportunities",
              "Process",
              "Awards",
              "AwardsPage",
              "MissionPage",
              "MissionValues",
              "CsrPage",
              "CsrPrograms",
              "CareerPage",
              "CareerJobs",
              "ContactPage",
              "Stats",
              "CTA",
              "Gallery",
              "Contact",
              "FAQ",
              "Testimonial",
            ].includes(activeSectionType) &&
              activeTab.endsWith("Content")) ||
              (Boolean(contentFields?.length) &&
                (activeTab === "Content" || activeTab.endsWith("Content")))
            ) ? (
                <div className="space-y-5">
                  {visibleGenericContentEntries.map(([key, value]) => (
                    <GenericFieldEditor
                      key={key}
                      fieldName={key}
                      value={value}
                      path={[key]}
                      sectionType={activeSectionType}
                      onChange={updateGenericField}
                      onMediaChange={updateGenericMedia}
                      onImagePickerRequest={openGenericImagePicker}
                      onOpenHrefPicker={openGenericHrefPicker}
                      onAddArrayItem={addGenericCollectionItem}
                      onDeleteArrayItem={deleteGenericCollectionItem}
                      availablePageNames={availablePageNames}
                    />
                  ))}
                </div>
              ) : null}

            {["Breadcrumb", "WhyChooseUs", "Features", "FeaturedDev", "InvestmentOpportunities", "Process", "Awards", "AwardsPage", "MissionPage", "MissionValues", "CsrPage", "CsrPrograms", "CareerPage", "CareerJobs", "ContactPage", "Stats", "CTA", "Service", "Gallery", "Contact", "FAQ", "Testimonial"].includes(activeSectionType) &&
              activeTab.endsWith("Layout") && (
                <div className="space-y-4">
                  {activeSectionType === "Gallery" && layoutOptions.length > 4 && (
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        aria-label="Previous gallery layouts"
                        onClick={() =>
                          setGalleryLayoutStart(
                            (prev) =>
                              (prev - 1 + layoutOptions.length) %
                              layoutOptions.length,
                          )
                        }
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 bg-white text-slate-700 hover:bg-slate-100"
                      >
                        <ChevronLeft size={17} />
                      </button>
                      <button
                        type="button"
                        aria-label="Next gallery layouts"
                        onClick={() =>
                          setGalleryLayoutStart(
                            (prev) => (prev + 1) % layoutOptions.length,
                          )
                        }
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 bg-white text-slate-700 hover:bg-slate-100"
                      >
                        <ChevronRight size={17} />
                      </button>
                    </div>
                  )}

                  {visibleLayoutOptions.map((layout) => {
                    const isActive =
                      layout.id === activeVariant ||
                      layout.id === currentSection?.variant ||
                      (unorderedLayoutOptions.length === 1 &&
                        layout.id.startsWith(`${activeSectionType}-`));
                    const Component = sectionRegistry[layout.id];

                    if (layout.isDatabase) {
                    return (
                        <DatabaseLayoutOptionCard
                        key={layout.id}
                          layout={layout}
                          category={category}
                          active={isActive}
                          liveContent={
                            activeSectionType === "Breadcrumb"
                              ? {
                                  title: editableGenericData?.title,
                                  pretitle: editableGenericData?.pretitle,
                                  homeLabel: editableGenericData?.homeLabel,
                                  desc: editableGenericData?.desc,
                                  desc2: editableGenericData?.desc2,
                                }
                              : undefined
                          }
                          onSelect={() => selectSectionVariant(layout.id)}
                          editorPart={eventsEditorPart}
                        />
                      );
                    }

                    const layoutPreviewData = {
                      ...(resolveLayoutPreview(layout.id, category)?.data ||
                        {}),
                      ...(activeSectionType === "Breadcrumb"
                        ? {
                            ...(typeof editableGenericData?.title === "string"
                              ? { title: editableGenericData.title }
                              : {}),
                            ...(typeof editableGenericData?.pretitle ===
                            "string"
                              ? { pretitle: editableGenericData.pretitle }
                              : {}),
                            ...(typeof editableGenericData?.homeLabel ===
                            "string"
                              ? { homeLabel: editableGenericData.homeLabel }
                              : {}),
                            ...(typeof editableGenericData?.desc === "string"
                              ? { desc: editableGenericData.desc }
                              : {}),
                            ...(typeof editableGenericData?.desc2 === "string"
                              ? { desc2: editableGenericData.desc2 }
                              : {}),
                          }
                        : {}),
                    };

                    return (
                      <div
                        key={layout.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => selectSectionVariant(layout.id)}
                        onKeyDown={(event) => {
                          if (event.key !== "Enter" && event.key !== " ") return;
                          event.preventDefault();
                          selectSectionVariant(layout.id);
                        }}
                        className={`relative isolate w-full cursor-pointer overflow-hidden rounded-2xl border bg-white text-left ${
                          isActive ? "border-gray-400 ring-2 ring-blue-500/20" : "border-gray-200"
                        }`}
                      >
                        <SelectedLayoutBadge active={isActive} />
                        <div className="relative z-0 h-36 overflow-hidden bg-white">
                          {Component ? (
                            <div className="pointer-events-none h-[520px] w-[1200px] origin-top-left scale-[0.32]">
                              <Component data={layoutPreviewData} editorPart={eventsEditorPart} />
                            </div>
                          ) : (
                            <div className="flex h-full items-center justify-center text-sm font-semibold">
                              {layout.name}
                            </div>
                          )}
                        </div>
                        <div className="relative z-10 flex items-center justify-between gap-3 px-4 py-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-800">
                          {layout.name}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500">
                              {isActive
                                ? "Currently selected"
                                : "Click to use this layout"}
                            </p>
                        </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            {activeSectionType === "Footer" &&
              activeTab === "Footer Layout" && (
                <div className="space-y-4">
                  {layoutOptions.map((layout) => {
                    const isActive = currentSection?.variant === layout.id;
                    const liveFooterContent = activeFooterData
                      ? (activeFooterData as Record<string, unknown>)
                      : null;

                    if (layout.isDatabase) {
                      return (
                        <DatabaseLayoutOptionCard
                          key={layout.id}
                          layout={layout}
                          category={category}
                          active={isActive}
                          liveContent={liveFooterContent}
                          onSelect={() => selectSectionVariant(layout.id)}
                          editorPart={eventsEditorPart}
                        />
                      );
                    }

                    return (
                      <button
                        key={layout.id}
                        type="button"
                        onClick={() => selectSectionVariant(layout.id)}
                        className={`relative w-full overflow-hidden rounded-2xl border bg-white text-left ${
                          isActive ? "border-gray-400" : "border-gray-200"
                        }`}
                      >
                        <SelectedLayoutBadge active={isActive} />
                        <div
                          className="grid h-32 grid-cols-[1.2fr_1fr_1fr_1fr] gap-4 p-4"
                          style={{
                            background: footerPreviewBackground,
                            color: footerTextColor,
                          }}
                        >
                          <div className="space-y-2">
                            <div className="h-4 w-20 rounded bg-current" />
                            <div className="h-2 w-full rounded bg-current opacity-60" />
                            <div className="h-2 w-4/5 rounded bg-current opacity-60" />
                            <div className="mt-4 flex gap-2">
                              <div className="h-5 w-5 rounded-full bg-current opacity-25" />
                              <div className="h-5 w-5 rounded-full bg-current opacity-25" />
                              <div className="h-5 w-5 rounded-full bg-current opacity-25" />
                            </div>
                          </div>
                          {[1, 2, 3].map((item) => (
                            <div key={item} className="space-y-2">
                              <div className="h-3 w-16 rounded bg-current" />
                              <div className="h-2 w-20 rounded bg-current opacity-50" />
                              <div className="h-2 w-24 rounded bg-current opacity-50" />
                              <div className="h-2 w-16 rounded bg-current opacity-50" />
                            </div>
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

            {activeSectionType === "Footer" &&
              activeTab === "Footer Settings" && (
                <SectionColorPanel
                  title="Footer Settings"
                  backgroundType={footerBackgroundType}
                  backgroundColor={footerSolidColor}
                  gradientColor={footerGradientColor}
                  textColor={footerTextColor}
                  onBackgroundTypeChange={updateFooterBackgroundType}
                  onBackgroundColorChange={updateFooterSolidColor}
                  onGradientColorChange={updateFooterGradientColor}
                  onTextColorChange={updateFooterTextColor}
                />
              )}

            {activeSectionType === "Footer" &&
              activeTab === "Footer Content" && (
                <div className="space-y-5">
                  <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                    <h3 className="text-xs font-semibold text-slate-800">Footer logo</h3>
                    <p className="mt-1 text-xs text-gray-500">Use a text logo or upload an image.</p>
                    <label className="mt-4 block text-xs font-medium text-gray-700">Logo text</label>
                    <input
                      value={activeFooterData?.logo ?? ""}
                      onChange={(event) => updateActiveFooterData({ logo: event.target.value })}
                      className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#315ff4] focus:ring-2 focus:ring-[#315ff4]/15"
                      placeholder="Your site name"
                    />
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          openImagePicker(
                            "Footer Logo Image",
                            activeFooterData?.logoImage ?? "",
                            (source, fileName) =>
                              updateActiveFooterData({
                                logoImage: source,
                                logoImageTitle:
                                  activeFooterData?.logoImageTitle || fileName,
                              }),
                          )
                        }
                        className={contentAddButtonClass}
                      >
                        Upload logo
                      </button>
                      {activeFooterData?.logoImage && (
                        <button
                          type="button"
                          onClick={() => updateActiveFooterData({ logoImage: "", logoImageTitle: "" })}
                          className="rounded-xl border border-red-100 bg-white px-3.5 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                        >
                          Remove image
                        </button>
                      )}
                      <span className="text-xs text-slate-500">{activeFooterData?.logoImageTitle ?? "No image selected"}</span>
                    </div>
                    <input
                      value={activeFooterData?.logoImageTitle ?? ""}
                      onChange={(event) =>
                        updateActiveFooterData({
                          logoImageTitle: event.target.value,
                        })
                      }
                      className="mt-3 h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#315ff4] focus:ring-2 focus:ring-[#315ff4]/15"
                      placeholder="Describe logo for accessibility…"
                    />
                  </div>

                  {(activeFooterData?.footerColumns ?? []).map((column, columnIndex) => (
                    <div
                      key={columnIndex}
                      className={`rounded-2xl border bg-white p-4 shadow-sm transition ${
                        column.hidden
                          ? "border-dashed border-slate-300 opacity-70"
                          : "border-gray-200"
                      }`}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={() => {
                        if (draggedFooterColumnIndex !== null) {
                          moveFooterColumn(draggedFooterColumnIndex, columnIndex);
                          setDraggedFooterColumnIndex(null);
                        }
                      }}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <button
                            type="button"
                            draggable
                            onDragStart={() =>
                              setDraggedFooterColumnIndex(columnIndex)
                            }
                            onDragEnd={() => setDraggedFooterColumnIndex(null)}
                            className="flex h-9 w-9 shrink-0 cursor-grab items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 active:cursor-grabbing"
                            title="Drag to reorder column"
                            aria-label="Drag to reorder column"
                          >
                            <GripVertical size={16} />
                          </button>
                          <h3 className="text-xs font-semibold text-slate-800">
                            Link column {columnIndex + 1}
                            {column.hidden ? (
                              <span className="ml-2 text-xs font-medium text-slate-400">
                                (hidden)
                              </span>
                            ) : null}
                          </h3>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            disabled={columnIndex === 0}
                            onClick={() =>
                              moveFooterColumn(columnIndex, columnIndex - 1)
                            }
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                            title="Move column up"
                            aria-label="Move column up"
                          >
                            <ChevronUp size={16} />
                          </button>
                          <button
                            type="button"
                            disabled={
                              columnIndex >=
                              (activeFooterData?.footerColumns?.length ?? 0) - 1
                            }
                            onClick={() =>
                              moveFooterColumn(columnIndex, columnIndex + 1)
                            }
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                            title="Move column down"
                            aria-label="Move column down"
                          >
                            <ChevronDown size={16} />
                          </button>
                          <VisibilityButton
                            hidden={Boolean(column.hidden)}
                            onClick={() => toggleFooterColumnHidden(columnIndex)}
                          />
                          <button
                            type="button"
                            onClick={() => addFooterLink(columnIndex)}
                            className={contentAddButtonClass}
                          >
                          <Plus size={13} /> Add link
                        </button>
                        </div>
                      </div>
                      <input
                        value={column.title}
                        onChange={(event) => updateFooterColumn(columnIndex, "title", event.target.value)}
                        className="mt-3 h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs outline-none transition focus:border-[#315ff4] focus:ring-2 focus:ring-[#315ff4]/15"
                        placeholder="e.g. Quick links"
                      />
                      <div className="mt-3 space-y-3">
                        {column.links.map((link, linkIndex) => (
                          <div
                            key={linkIndex}
                            className="grid gap-2 rounded-2xl border border-slate-200 bg-slate-50/50 p-3 ring-1 ring-slate-100 sm:grid-cols-[auto_1fr_1.4fr_auto] sm:items-center"
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={() => {
                              if (
                                draggedFooterLink &&
                                draggedFooterLink.columnIndex === columnIndex
                              ) {
                                moveFooterLink(
                                  columnIndex,
                                  draggedFooterLink.linkIndex,
                                  linkIndex,
                                );
                                setDraggedFooterLink(null);
                              }
                            }}
                          >
                            <button
                              type="button"
                              draggable
                              onDragStart={() =>
                                setDraggedFooterLink({ columnIndex, linkIndex })
                              }
                              onDragEnd={() => setDraggedFooterLink(null)}
                              className="flex h-11 w-11 cursor-grab items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 active:cursor-grabbing"
                              title="Drag to reorder link"
                              aria-label="Drag to reorder link"
                            >
                              <GripVertical size={15} />
                            </button>
                            <input
                              value={link.label}
                              onChange={(event) =>
                                updateFooterLink(
                                  columnIndex,
                                  linkIndex,
                                  "label",
                                  event.target.value,
                                )
                              }
                              className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs outline-none transition focus:border-[#315ff4] focus:ring-2 focus:ring-[#315ff4]/15"
                              placeholder="e.g. About us"
                            />
                            <HrefDestinationButton
                              value={link.href}
                              onClick={() =>
                                openFooterHrefPicker(columnIndex, linkIndex)
                              }
                              className="h-9"
                            />
                            <button
                              type="button"
                              aria-label="Remove footer link"
                              onClick={() =>
                                removeFooterLink(columnIndex, linkIndex)
                              }
                              className="grid size-11 place-items-center rounded-xl border border-red-100 bg-white text-red-600 transition hover:bg-red-50"
                            >
                              <Trash size={15} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                </div>
              )}

            {activeTab.endsWith("Content") &&
              activeSectionType !== "Topbar" &&
              automaticContentFields.length > 0 && (
                <section className={`${contentFieldCardClass} space-y-3.5`}>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-800">
                      Additional content
                  </h4>
                    <p className="mt-0.5 text-[10px] text-slate-500">
                      Extra fields for this section layout.
                    </p>
                  </div>
                  {automaticContentFields.map((field) => (
                    <div key={field.path.join(".")} className="pt-0.5">
                    <GenericFieldEditor
                      fieldName={field.fieldName}
                      value={field.value}
                      path={field.path}
                      sectionType={activeSectionType}
                      onChange={updateGenericField}
                      onMediaChange={updateGenericMedia}
                        onImagePickerRequest={openGenericImagePicker}
                        onOpenHrefPicker={openGenericHrefPicker}
                      availablePageNames={availablePageNames}
                    />
                    </div>
                  ))}
                </section>
              )}

            {activeSectionType === "Footer" &&
              (activeTab === "Floating Item" ||
                activeTab === "External Link") && (
                <div className="space-y-3">
                  <div className={`${contentFieldCardClass} !py-3`}>
                    <p className="text-xs font-semibold text-slate-800">
                      Floating items
                    </p>
                    <p className="mt-0.5 text-[10px] text-slate-500">
                      Reorder, change icons, and turn WhatsApp / Call / Back to
                      top on or off.
                    </p>
                  </div>

                  {floatingItems.map((item, index) => {
                    const isBackToTop = item.id === "backToTop";
                    return (
                      <div
                        key={`${item.id}-${index}`}
                        className={`${contentFieldCardClass} space-y-3 ${
                          item.active ? "" : "opacity-70"
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-800">
                              {item.label}
                            </p>
                            <p className="mt-0.5 text-[10px] text-slate-500">
                              {isBackToTop
                                ? "Scrolls visitors back to the top"
                                : item.side === "right"
                                  ? "Shows on the right"
                                  : "Shows on the left"}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                              disabled={index === 0}
                              onClick={() => moveFloatingItem(index, index - 1)}
                              className="grid size-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                              aria-label={`Move ${item.label} up`}
                              title="Move up"
                            >
                              <ChevronUp size={14} />
                        </button>
                            <button
                              type="button"
                              disabled={index >= floatingItems.length - 1}
                              onClick={() => moveFloatingItem(index, index + 1)}
                              className="grid size-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                              aria-label={`Move ${item.label} down`}
                              title="Move down"
                            >
                              <ChevronDown size={14} />
                            </button>
                        <button
                          type="button"
                          onClick={() =>
                                updateFloatingItem(index, {
                                  active: !item.active,
                                })
                              }
                              className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition ${
                                item.active
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                  : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100"
                              }`}
                            >
                              {item.active ? "Active" : "Inactive"}
                        </button>
                    </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <label className={contentFieldLabelClass}>
                              Label
                            </label>
                    <input
                              value={item.label}
                      onChange={(event) =>
                                updateFloatingItem(index, {
                                  label: event.target.value,
                                })
                              }
                              className={contentFieldInputClass}
                              placeholder="Button label"
                    />
                  </div>
                          <div>
                            <label className={contentFieldLabelClass}>
                              Icon
                      </label>
                            <select
                              value={item.icon}
                              onChange={(event) =>
                                updateFloatingItem(index, {
                                  icon: event.target.value as FloatingItemIcon,
                                })
                              }
                              className={contentFieldInputClass}
                              aria-label={`${item.label} icon`}
                            >
                              {getFloatingItemIconOptions(item.id).map(
                                (option) => (
                                  <option
                                    key={option.value}
                                    value={option.value}
                                  >
                                    {option.label}
                                  </option>
                                ),
                              )}
                            </select>
                    </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <label className={contentFieldLabelClass}>
                              Side
                            </label>
                            <select
                              value={item.side}
                              onChange={(event) =>
                                updateFloatingItem(index, {
                                  side: event.target.value as FloatingItemSide,
                                })
                              }
                              className={contentFieldInputClass}
                              aria-label={`${item.label} side`}
                            >
                              <option value="left">Left</option>
                              <option value="right">Right</option>
                            </select>
                          </div>
                          {!isBackToTop ? (
                            <div>
                              <label className={contentFieldLabelClass}>
                                Link
                              </label>
                    <input
                                value={item.href ?? ""}
                      onChange={(event) =>
                                  updateFloatingItem(index, {
                                    href: event.target.value,
                                  })
                                }
                                className={contentFieldInputClass}
                                placeholder={
                                  item.id === "whatsapp"
                                    ? DEFAULT_WHATSAPP_LINK
                                    : item.id === "call"
                                      ? DEFAULT_CALL_LINK
                                      : "https://…"
                                }
                    />
                  </div>
                          ) : (
                            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-2.5 py-2 text-[11px] text-slate-500">
                              Back to top uses page scroll — no link needed.
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            {activeSectionType === "Header" &&
              activeTab === "Nav Menu" && (
                <div className="space-y-4">
                  <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs font-semibold text-slate-800">
                          Navigation links
                        </p>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                            menuItems.length >= MAX_MENU_LINKS
                              ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                              : "bg-blue-50 text-blue-700 ring-1 ring-blue-100"
                          }`}
                        >
                          {menuItems.length} of {MAX_MENU_LINKS} used
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs leading-5 text-slate-500">
                        {isSinglePage
                          ? "Tip: use Sections for on-page anchors (FAQ, Gallery). Use Pages for Home, Legal, and Blogs."
                          : "Tip: Link = one destination. Dropdown / Mega = add sub-links under this item."}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={addMenuItem}
                      disabled={menuItems.length >= MAX_MENU_LINKS}
                      className={`${contentAddButtonClass} shrink-0 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none`}
                    >
                      <Plus size={14} />
                      Add link
                    </button>
                  </div>

                  {menuItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center shadow-sm">
                      <p className="text-sm font-semibold text-slate-800">
                        No menu links yet
                      </p>
                      <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">
                        Add your first link to start building the header
                        navigation visitors will use.
                      </p>
                      <button
                        type="button"
                        onClick={addMenuItem}
                        className={`mt-4 ${contentAddButtonClass}`}
                      >
                        <Plus size={14} />
                        Add first link
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="hidden grid-cols-[2.5rem_minmax(7rem,1fr)_minmax(7rem,1fr)_minmax(7.5rem,9rem)_3.25rem] gap-2 px-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400 lg:grid">
                        <span className="text-center">Move</span>
                        <span>Label</span>
                        <span>Goes to</span>
                        <span>Style</span>
                        <span />
                      </div>

                      <div className="space-y-2.5">
                        {menuItems.map((item, index) => {
                          const menuType =
                            item.menuType ||
                            (item.children?.length ? "dropdown" : "link");
                          const rowKey = `nav-row-${index}`;
                          const isDragging = draggedIndex === index;
                          const isDropTarget =
                            menuDropTargetIndex === index &&
                            draggedIndex !== null &&
                            draggedIndex !== index;
                          return (
                      <div
                        key={rowKey}
                              data-menu-row
                              data-menu-index={index}
                              ref={
                                index === menuItems.length - 1
                                  ? lastMenuItemRef
                                  : undefined
                              }
                              className={`rounded-2xl border bg-white p-3 shadow-sm transition hover:border-slate-300 hover:shadow-md ${
                                isDragging
                                  ? "border-blue-400 bg-blue-50/50 ring-2 ring-blue-400/30"
                                  : isDropTarget
                                    ? "border-emerald-400 ring-2 ring-emerald-400/30"
                                    : "border-slate-200"
                              }`}
                            >
                              <div className="mb-2 flex items-center justify-between gap-2 lg:hidden">
                                <p className="text-xs font-semibold text-slate-500">
                                  Link {index + 1}
                                </p>
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                  {menuType}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-[2.5rem_minmax(7rem,1fr)_minmax(7rem,1fr)_minmax(7.5rem,9rem)_3.25rem] lg:items-center">
                          <div
                            role="button"
                            tabIndex={0}
                            data-editor-no-drag
                            data-drag-handle
                            onPointerDown={(event) => {
                              if (event.button !== 0) return;
                              event.preventDefault();
                              event.stopPropagation();
                              event.currentTarget.setPointerCapture(
                                event.pointerId,
                              );
                              menuReorderRef.current = {
                                fromIndex: index,
                                pointerId: event.pointerId,
                                dropIndex: index,
                              };
                              setDraggedIndex(index);
                              setMenuDropTargetIndex(index);
                            }}
                            onPointerMove={(event) => {
                              const active = menuReorderRef.current;
                              if (
                                !active ||
                                active.pointerId !== event.pointerId
                              ) {
                                return;
                              }
                              const under = document.elementFromPoint(
                                event.clientX,
                                event.clientY,
                              );
                              const row = under?.closest(
                                "[data-menu-row]",
                              ) as HTMLElement | null;
                              if (!row) return;
                              const nextIndex = Number.parseInt(
                                row.dataset.menuIndex || "",
                                10,
                              );
                              if (!Number.isFinite(nextIndex)) return;
                              active.dropIndex = nextIndex;
                              setMenuDropTargetIndex(nextIndex);
                            }}
                            onPointerUp={(event) => {
                              const active = menuReorderRef.current;
                              if (
                                !active ||
                                active.pointerId !== event.pointerId
                              ) {
                                return;
                              }
                              try {
                                event.currentTarget.releasePointerCapture(
                                  event.pointerId,
                                );
                              } catch {
                                /* already released */
                              }
                              endMenuReorder();
                            }}
                            onPointerCancel={() => {
                              menuReorderRef.current = null;
                              setDraggedIndex(null);
                              setMenuDropTargetIndex(null);
                            }}
                                  className="flex h-10 w-10 cursor-grab items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-400 transition hover:border-slate-300 hover:bg-white hover:text-slate-600 active:cursor-grabbing"
                                  title="Drag to reorder"
                                  aria-label="Drag to reorder"
                          >
                                  <GripVertical size={16} />
                          </div>

                                <label className="block space-y-1">
                                  <span className="text-[11px] font-semibold text-slate-500 lg:sr-only">
                                    Label
                                  </span>
                          <input
                                    ref={
                                      index === menuItems.length - 1
                                        ? newMenuLabelInputRef
                                        : undefined
                                    }
                            value={item.label}
                            onChange={(e) =>
                                      updateMenuItem(
                                        index,
                                        "label",
                                        e.target.value,
                                      )
                                    }
                                    onBlur={syncNavMenuPageLinks}
                                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-[#315ff4] focus:ring-2 focus:ring-[#315ff4]/15"
                                    placeholder="e.g. About"
                                  />
                                </label>

                                <label className="block space-y-1">
                                  <span className="text-[11px] font-semibold text-slate-500 lg:sr-only">
                                    Destination
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => openNavHrefPicker(index)}
                                    className="flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 text-left outline-none transition hover:border-blue-400 hover:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
                                    title="Choose where this link opens"
                                  >
                                    <span className="min-w-0">
                                      <span className="block truncate text-xs font-semibold text-slate-800">
                                        {resolveNavHrefLabel(item.href)}
                                      </span>
                                      <span className="block truncate text-[11px] text-slate-400">
                                        {item.href || "Not set"}
                                      </span>
                                    </span>
                                    <ChevronDown
                                      size={16}
                                      className="shrink-0 text-slate-400"
                                    />
                                  </button>
                                </label>

                                <label className="block space-y-1">
                                  <span className="text-[11px] font-semibold text-slate-500 lg:sr-only">
                                    Style
                                  </span>
                                  <select
                                    value={menuType}
                                    onChange={(event) =>
                                      setMenuItemType(
                                        index,
                                        event.target.value as
                                          | "link"
                                          | "dropdown"
                                          | "mega",
                                      )
                                    }
                                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-2.5 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/15"
                                    aria-label="Menu item type"
                                  >
                                    <option value="link">
                                      Link — single page
                                    </option>
                                    <option value="dropdown">
                                      Dropdown — sub links
                                    </option>
                                    <option value="mega">
                                      Mega menu — large panel
                                    </option>
                                  </select>
                                </label>

                          <button
                            type="button"
                                  onClick={() => deleteMenuItem(index)}
                                  className="flex h-10 w-10 items-center justify-center self-end rounded-xl border border-red-100 bg-red-50 text-red-600 transition hover:border-red-200 hover:bg-red-100 lg:self-auto"
                                  aria-label={`Delete ${item.label || "menu item"}`}
                                >
                                  <Trash size={16} />
                          </button>
                              </div>

                              {((item.menuType === "dropdown" ||
                                item.menuType === "mega") ||
                                (!!item.children?.length &&
                                  item.menuType !== "link")) && (
                                <div className="mt-3 space-y-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-3 lg:ml-[3.25rem]">
                                  <div className="flex items-center justify-between gap-2">
                                    <div>
                                      <p className="text-xs font-semibold text-slate-700">
                                        {(item.menuType || "dropdown") ===
                                        "mega"
                                          ? "Mega menu items"
                                          : "Dropdown items"}
                                      </p>
                                      <p className="text-[11px] text-slate-500">
                                        These appear under “{item.label || "this link"}”
                                      </p>
                                    </div>
                          <button
                            type="button"
                                      onPointerDown={(event) =>
                                        event.stopPropagation()
                                      }
                                      onClick={() => addDropdownItem(index)}
                                      disabled={
                                        (item.children?.length ?? 0) >=
                                        ((item.menuType || "dropdown") ===
                                        "mega"
                                          ? MAX_MEGA_LINKS
                                          : MAX_DROPDOWN_LINKS)
                                      }
                                      className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-600 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                                    >
                                      <Plus size={12} />
                                      Add item
                          </button>
                        </div>

                                  {(item.children?.length ?? 0) === 0 ? (
                                    <p className="rounded-lg bg-white px-3 py-2 text-xs text-slate-500 ring-1 ring-slate-100">
                                      No sub-links yet — click Add item.
                                    </p>
                                  ) : null}

                                  {item.children?.map((child, childIndex) => (
                              <div
                                key={childIndex}
                                      className="grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-white p-2 lg:grid-cols-[minmax(10rem,1fr)_minmax(10rem,1fr)_2.75rem]"
                              >
                                <input
                                  value={child.label}
                                  onChange={(e) =>
                                    updateDropdownItem(
                                      index,
                                      childIndex,
                                      "label",
                                      e.target.value,
                                    )
                                  }
                                  onBlur={syncNavMenuPageLinks}
                                        className="h-10 rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/15"
                                        placeholder="Sub-link label"
                                      />

                                      <button
                                        type="button"
                                        onClick={() =>
                                          openNavHrefPicker(index, childIndex)
                                        }
                                        className="flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 text-left outline-none transition hover:border-blue-400 hover:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
                                        title="Choose link destination"
                                      >
                                        <span className="min-w-0">
                                          <span className="block truncate text-sm font-medium text-slate-800">
                                            {resolveNavHrefLabel(child.href)}
                                          </span>
                                          <span className="block truncate text-[11px] text-slate-400">
                                            {child.href || "Not set"}
                                          </span>
                                        </span>
                                        <ChevronDown
                                          size={16}
                                          className="shrink-0 text-slate-400"
                                        />
                                      </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    deleteDropdownItem(index, childIndex)
                                  }
                                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-100 bg-white text-red-600 transition hover:bg-red-50"
                                        aria-label="Delete sub-link"
                                >
                                        <Trash size={15} />
                                </button>
                              </div>
                            ))}

                                  <p className="text-[11px] text-slate-500">
                                    {item.children?.length ?? 0}/
                                    {(item.menuType || "dropdown") === "mega"
                                      ? MAX_MEGA_LINKS
                                      : MAX_DROPDOWN_LINKS}{" "}
                                    {(item.menuType || "dropdown") === "mega"
                                      ? "mega"
                                      : "dropdown"}{" "}
                                    links added
                                  </p>
                          </div>
                        )}
                      </div>
                          );
                        })}
                  </div>
                    </>
                  )}
                </div>
              )}
          </main>
        </div>

        <div className="shrink-0 border-t border-slate-200/90 bg-white px-4 py-2.5 sm:px-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[10px] leading-4 text-slate-400">
              Drag the header to move this panel. Click{" "}
              <span className="font-semibold text-slate-600">Done</span> to save
              your edits.
            </p>
            <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
                className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleDone}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#08132f] px-4 py-1.5 text-xs font-semibold text-white shadow-[0_6px_16px_rgba(8,19,47,0.22)] transition hover:bg-[#315ff4]"
            >
                <Check size={13} strokeWidth={2.5} />
              Done
            </button>
            </div>
          </div>
        </div>
      </div>

      <ImageLibraryPicker
        open={Boolean(imagePickerTarget)}
        title={imagePickerTarget?.title ?? "Image"}
        initialValue={imagePickerTarget?.currentValue}
        onClose={() => setImagePickerTarget(null)}
        onSelect={(source, fileName) => {
          imagePickerTarget?.apply(source, fileName);
          setImagePickerTarget(null);
        }}
      />

      {hrefPicker &&
        createPortal(
          <div
            className="fixed inset-0 z-[10060] flex items-center justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-[1px]"
            role="dialog"
            aria-modal="true"
            aria-label="Choose link destination"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeHrefPicker();
            }}
          >
            <div className="w-[min(94vw,440px)] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.28)]">
              <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-4 py-3.5">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    Navigation
                  </p>
                  <h3 className="text-sm font-bold text-slate-900">
                    Where should this go?
                  </h3>
                  <p className="mt-0.5 text-[10px] text-slate-500">
                    {hrefPickerKind === "pages"
                      ? isSinglePage
                        ? "Home, Legal pages, and Blogs"
                        : "Website pages"
                      : hrefPickerKind === "sections"
                        ? "Scroll to a section on this page"
                        : hrefPickerKind === "blogs"
                          ? "Blog index or a specific post"
                          : "Paste any URL or #anchor"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeHrefPicker}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-100"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-slate-50/60 px-3 pt-3">
                {NAV_HREF_PICKER_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setHrefPickerKind(tab.id);
                      if (tab.id === "pages") {
                        setHrefPickerValue(
                          navPageOptions.some(
                            (option) => option.href === hrefPickerValue,
                          )
                            ? hrefPickerValue
                            : navPageOptions[0]?.href || "#",
                        );
                      } else if (tab.id === "sections") {
                        setHrefPickerValue(
                          navSectionOptions.some(
                            (option) => option.href === hrefPickerValue,
                          )
                            ? hrefPickerValue
                            : navSectionOptions[0]?.href || "#",
                        );
                      } else if (tab.id === "blogs") {
                        setHrefPickerValue(
                          navBlogOptions.some(
                            (option) => option.href === hrefPickerValue,
                          )
                            ? hrefPickerValue
                            : navBlogOptions[0]?.href || "#page-blogs",
                        );
                      }
                    }}
                    className={`shrink-0 rounded-t-xl px-3.5 py-2 text-sm font-semibold transition ${
                      hrefPickerKind === tab.id
                        ? "bg-white text-blue-700 shadow-[0_-1px_0_rgba(37,99,235,0.35)_inset]"
                        : "text-slate-500 hover:bg-white/70 hover:text-slate-800"
                    }`}
                    aria-pressed={hrefPickerKind === tab.id}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="max-h-[min(50vh,320px)] space-y-2 overflow-y-auto p-4">
                {hrefPickerKind === "custom" ? (
                  <>
                    <label className="block text-xs font-semibold text-slate-600">
                      Custom URL or anchor
                    </label>
                    <input
                      value={hrefPickerValue}
                      onChange={(event) =>
                        setHrefPickerValue(event.target.value)
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          applyHrefPicker();
                        }
                      }}
                      placeholder="#section, /page, or https://..."
                      className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-blue-500"
                      autoFocus
                    />
                  </>
                ) : (
                  (hrefPickerKind === "blogs"
                    ? navBlogOptions
                    : hrefPickerKind === "sections"
                      ? navSectionOptions
                      : navPageOptions
                  ).map((option) => {
                    const selected =
                      safeHref(option.href).toLowerCase() ===
                      safeHref(hrefPickerValue).toLowerCase();
                    return (
                      <button
                        key={`${hrefPickerKind}-${option.href}`}
                        type="button"
                        onClick={() => applyHrefPicker(option.href)}
                        className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                          selected
                            ? "border-blue-500 bg-blue-50 text-blue-800"
                            : "border-slate-200 text-slate-800 hover:border-blue-300 hover:bg-slate-50"
                        }`}
                      >
                        <span className="min-w-0">
                          <span className="block font-semibold">
                            {option.label}
                          </span>
                          <span className="block truncate text-xs text-slate-500">
                            {option.href}
                          </span>
                        </span>
                        {selected ? (
                          <Check size={16} className="shrink-0 text-blue-600" />
                        ) : null}
                      </button>
                    );
                  })
                )}

                {hrefPickerKind === "pages" && navPageOptions.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No pages available yet.
                  </p>
                ) : null}
                {hrefPickerKind === "sections" &&
                navSectionOptions.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No sections available yet.
                  </p>
                ) : null}
              </div>

              {hrefPickerKind === "custom" ? (
                <div className="flex justify-end gap-2 border-t border-slate-200 px-4 py-3">
                  <button
                    type="button"
                    onClick={closeHrefPicker}
                    className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => applyHrefPicker()}
                    className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Apply
                  </button>
                </div>
              ) : null}
            </div>
          </div>,
          document.body,
        )}

      {generationText && (
        <div className="fixed inset-0 z-[10002] flex items-center justify-center bg-slate-950/45 backdrop-blur-[2px]">
          <style>
            {`
              @keyframes bannerLoaderSpin {
                to { transform: rotate(360deg); }
              }

              @keyframes bannerTextRoll {
                0%, 100% { transform: translateY(0); opacity: 0.65; }
                45% { transform: translateY(-0.22rem); opacity: 1; }
              }
            `}
          </style>
          <div className="relative overflow-hidden rounded-[1.35rem] p-[3px] shadow-2xl">
            <div className="absolute -inset-24 bg-[conic-gradient(from_0deg,#2563eb,#a855f7,#22c55e,#f59e0b,#ef4444,#2563eb)] animate-[bannerLoaderSpin_1.6s_linear_infinite]" />
            <div className="relative flex items-center gap-3 rounded-[1.2rem] bg-white/90 px-6 py-5 text-2xl font-medium text-slate-950 shadow-sm">
              <span className="grid h-6 w-6 place-items-center rounded-md bg-blue-600 text-xs text-white">
                AI
              </span>
              <span className="inline-flex overflow-hidden">
                {generationText.split("").map((char, index) => (
                  <span
                    key={`${char}-${index}`}
                    className="inline-block animate-[bannerTextRoll_1.1s_ease-in-out_infinite]"
                    style={{ animationDelay: `${index * 0.045}s` }}
                  >
                    {char === " " ? "\u00A0" : char}
                  </span>
                ))}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getSidebarTabIcon(item: string) {
  if (item.includes("Layout")) return LayoutTemplate;
  if (item.includes("Settings")) return Settings2;
  if (item.includes("Menu") || item.includes("Nav") || item.includes("External") || item.includes("Floating"))
    return Link2;
  if (item.includes("Content")) return FileText;
  return PanelTop;
}

function SidebarContent({
  items,
  activeTab,
  setActiveTab,
}: {
  items: string[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
}) {
  return (
    <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1 text-sm">
      {items.map((item) => {
        const isActive = activeTab === item;
        const hint = SIDEBAR_TAB_HINTS[item];
        const Icon = getSidebarTabIcon(item);
        return (
        <button
          key={item}
          type="button"
          onClick={() => setActiveTab(item)}
            className={`group/nav relative w-full rounded-xl px-2.5 py-2 text-left transition ${
              isActive
                ? "bg-[#08132f] text-white shadow-[0_8px_18px_rgba(8,19,47,0.2)]"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <span className="flex items-start gap-2">
              <span
                className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg ${
                  isActive
                    ? "bg-white/15 text-white"
                    : "bg-slate-100 text-slate-500 group-hover/nav:bg-blue-50 group-hover/nav:text-blue-600"
                }`}
              >
                <Icon size={13} strokeWidth={2.1} />
              </span>
              <span className="min-w-0 pt-0.5">
                <span className="block text-xs font-semibold leading-4">
          {item}
                </span>
                {hint ? (
                  <span
                    className={`mt-0.5 block text-[10px] font-normal ${
                      isActive ? "text-white/65" : "text-slate-400"
                    }`}
                  >
                    {hint}
                  </span>
                ) : null}
              </span>
            </span>
        </button>
        );
      })}
    </div>
  );
}

function SettingsBlock({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_6px_20px_rgba(15,23,42,0.04)] sm:p-5">
      <div className="mb-4 border-b border-slate-100 pb-3">
        <h5 className="text-sm font-semibold tracking-[-0.01em] text-slate-950">
          {title}
        </h5>
        {description ? (
          <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
        ) : null}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function ToggleOptionGroup<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-700">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isActive = value === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              aria-pressed={isActive}
              className={`inline-flex h-9 min-w-24 flex-1 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-semibold capitalize transition sm:flex-none ${
                isActive
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-gray-200 bg-gray-50 text-gray-700 hover:border-blue-200 hover:bg-blue-50"
              }`}
            >
              {isActive ? <Check size={14} aria-hidden="true" /> : null}
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RangeControl({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
          {value}px
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-blue-600"
        aria-label={label}
      />
    </label>
  );
}

function SectionColorPanel({
  title,
  sectionTypeLabel,
  stickyType,
  backgroundType,
  backgroundColor,
  gradientColor,
  textColor,
  onStickyTypeChange,
  onBackgroundTypeChange,
  onBackgroundColorChange,
  onGradientColorChange,
  onTextColorChange,
  activeMenuTextColor,
  activeMenuBackgroundColor,
  activeMenuStyle,
  activeMenuKeepTextColor,
  activeMenuLineGap,
  activeMenuPadding,
  onActiveMenuTextColorChange,
  onActiveMenuBackgroundColorChange,
  onActiveMenuStyleChange,
  onActiveMenuKeepTextColorChange,
  onActiveMenuLineGapChange,
  onActiveMenuPaddingChange,
}: {
  title: string;
  sectionTypeLabel?: string;
  stickyType?: StickySectionType;
  backgroundType: "solid" | "gradient";
  backgroundColor: string;
  gradientColor: string;
  textColor: string;
  onStickyTypeChange?: (type: StickySectionType) => void;
  onBackgroundTypeChange: (type: "solid" | "gradient") => void;
  onBackgroundColorChange: (color: string) => void;
  onGradientColorChange: (color: string) => void;
  onTextColorChange: (color: string) => void;
  activeMenuTextColor?: string;
  activeMenuBackgroundColor?: string;
  activeMenuStyle?: HeaderActiveMenuStyle;
  activeMenuKeepTextColor?: boolean;
  activeMenuLineGap?: number;
  activeMenuPadding?: number;
  onActiveMenuTextColorChange?: (color: string) => void;
  onActiveMenuBackgroundColorChange?: (color: string) => void;
  onActiveMenuStyleChange?: (style: HeaderActiveMenuStyle) => void;
  onActiveMenuKeepTextColorChange?: (keep: boolean) => void;
  onActiveMenuLineGapChange?: (gap: number) => void;
  onActiveMenuPaddingChange?: (padding: number) => void;
}) {
  const hasActiveMenu = Boolean(activeMenuStyle && onActiveMenuStyleChange);

  return (
    <section className="space-y-4">
      <div>
          <h4 className="text-lg font-semibold text-gray-950">{title}</h4>
        <p className="mt-1 text-sm text-gray-500">
          {hasActiveMenu
            ? "Configure header behavior, colors, and active menu appearance."
            : "Configure section colors and background style."}
          </p>
        </div>

      <SettingsBlock
        title="Layout"
        description="Choose how this section behaves and fills the background."
      >
        <div className="grid gap-4 md:grid-cols-2">
          {sectionTypeLabel && stickyType && onStickyTypeChange ? (
            <ToggleOptionGroup
              label={sectionTypeLabel}
              value={stickyType}
              options={[
                { value: "scroll", label: "Scroll" },
                { value: "sticky", label: "Sticky" },
              ]}
              onChange={onStickyTypeChange}
            />
          ) : null}

          <ToggleOptionGroup
            label="Background type"
            value={backgroundType}
            options={[
              { value: "solid", label: "Solid" },
              { value: "gradient", label: "Gradient" },
            ]}
            onChange={onBackgroundTypeChange}
          />
        </div>
      </SettingsBlock>

      <SettingsBlock
        title="Colors"
        description="Set the default text and background colors for this section."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <ColorInput
          label="Text color"
          value={textColor}
          onChange={onTextColorChange}
        />

        <ColorInput
          label={
            backgroundType === "gradient"
              ? "Background left"
              : "Background color"
          }
          value={backgroundColor}
          onChange={onBackgroundColorChange}
        />

        {backgroundType === "gradient" && (
          <ColorInput
            label="Background right"
            value={gradientColor}
            onChange={onGradientColorChange}
          />
        )}
      </div>
      </SettingsBlock>

      {hasActiveMenu ? (
        <SettingsBlock
          title="Active menu"
          description="Control how the current page link looks in the navigation."
        >
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Style</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {HEADER_ACTIVE_MENU_STYLE_OPTIONS.map((option) => {
                const isActive = activeMenuStyle === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onActiveMenuStyleChange?.(option.value)}
                    aria-pressed={isActive}
                    className={`inline-flex h-10 min-w-0 items-center justify-center gap-1.5 rounded-lg border px-2 text-xs font-semibold whitespace-nowrap transition sm:text-sm ${
                      isActive
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-gray-200 bg-gray-50 text-gray-700 hover:border-blue-200 hover:bg-blue-50"
                    }`}
                  >
                    {isActive ? <Check size={14} className="shrink-0" aria-hidden="true" /> : null}
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          {activeMenuStyle !== "text-only" &&
          onActiveMenuKeepTextColorChange ? (
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Keep default menu text color
                </p>
                <p className="text-xs text-gray-500">
                  Active item text stays the same as other menu links.
                </p>
              </div>
              <input
                type="checkbox"
                checked={activeMenuKeepTextColor ?? false}
                onChange={(event) =>
                  onActiveMenuKeepTextColorChange(event.target.checked)
                }
                className="h-4 w-4 shrink-0 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </label>
          ) : null}

          {activeMenuStyle === "background" && onActiveMenuPaddingChange ? (
            <RangeControl
              label="Menu padding"
              value={activeMenuPadding ?? DEFAULT_ACTIVE_MENU_PADDING}
              min={0}
              max={24}
              step={1}
              onChange={onActiveMenuPaddingChange}
            />
          ) : null}

          {(activeMenuStyle === "underline" ||
            activeMenuStyle === "curved-underline") &&
          onActiveMenuLineGapChange ? (
            <RangeControl
              label="Line spacing"
              value={activeMenuLineGap ?? DEFAULT_ACTIVE_MENU_LINE_GAP}
              min={0}
              max={24}
              step={1}
              onChange={onActiveMenuLineGapChange}
            />
          ) : null}

          {(activeMenuTextColor &&
            onActiveMenuTextColorChange &&
            !activeMenuKeepTextColor) ||
          (activeMenuStyle === "background" &&
            activeMenuBackgroundColor &&
            onActiveMenuBackgroundColorChange) ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {activeMenuTextColor &&
              onActiveMenuTextColorChange &&
              !activeMenuKeepTextColor ? (
                <ColorInput
                  label="Active menu text"
                  value={activeMenuTextColor}
                  onChange={onActiveMenuTextColorChange}
                />
              ) : null}

              {activeMenuStyle === "background" &&
              activeMenuBackgroundColor &&
              onActiveMenuBackgroundColorChange ? (
                <ColorInput
                  label="Active menu background"
                  value={activeMenuBackgroundColor}
                  onChange={onActiveMenuBackgroundColorChange}
                />
              ) : null}
            </div>
          ) : null}
        </SettingsBlock>
      ) : null}
    </section>
  );
}

function toColorPickerValue(value: string) {
  const trimmed = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed;
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    const [r, g, b] = trimmed.slice(1);
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return "#000000";
}

const SECTION_COLOR_PRESETS = [
  "#000000",
  "#ffffff",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#64748b",
  "#0f172a",
  "#245c6e",
  "#1d4ed8",
  "#0d1f2a",
  "#f8fafc",
];

function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (color: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const pickerValue = toColorPickerValue(value);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className="relative flex flex-col gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5"
    >
      <span className="text-xs font-medium text-gray-500">{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className={`h-8 w-8 shrink-0 rounded-lg border border-gray-200 shadow-sm transition hover:scale-[1.03] ${
            open ? "ring-2 ring-blue-200 ring-offset-1" : ""
          }`}
          style={{ backgroundColor: pickerValue }}
          aria-label={`${label} picker`}
          aria-expanded={open}
          title="Choose color"
        />
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="#2563eb"
          spellCheck={false}
          className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs font-medium uppercase text-gray-700 outline-none focus:border-blue-400"
          aria-label={`${label} code`}
        />
      </div>

      {open ? (
        <div className="absolute bottom-[calc(100%-0.25rem)] left-0 z-30 w-56 rounded-2xl border border-slate-200 bg-white p-3 text-slate-800 shadow-[0_16px_40px_rgba(15,23,42,0.18)]">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold text-slate-700">{label}</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label={`Close ${label} picker`}
              title="Close"
            >
              <X size={12} />
            </button>
          </div>

          <div className="grid grid-cols-6 gap-1.5">
            {SECTION_COLOR_PRESETS.map((color) => {
              const selected = pickerValue.toLowerCase() === color.toLowerCase();
              return (
                <button
                  key={color}
                  type="button"
                  onClick={() => onChange(color)}
                  className={`h-6 w-6 rounded-md border transition hover:scale-105 ${
                    selected
                      ? "border-blue-500 ring-2 ring-blue-200"
                      : color.toLowerCase() === "#ffffff"
                        ? "border-slate-300"
                        : "border-slate-200"
                  }`}
                  style={{ backgroundColor: color }}
                  aria-label={`Use color ${color}`}
                  title={color}
                />
              );
            })}
          </div>

          <div className="mt-3 flex items-center gap-2">
        <input
          type="color"
              value={pickerValue}
              onChange={(event) => onChange(event.target.value)}
              className="h-8 w-10 cursor-pointer rounded-md border border-slate-200 bg-white p-0.5"
              aria-label={`${label} custom`}
              title="Custom color"
            />
            <input
              type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
              className="h-8 min-w-0 flex-1 rounded-md border border-slate-200 px-2 text-[11px] font-medium uppercase outline-none focus:border-blue-400"
              aria-label={`${label} hex`}
              spellCheck={false}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
