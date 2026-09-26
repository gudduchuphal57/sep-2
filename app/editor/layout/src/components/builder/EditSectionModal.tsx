"use client";

import { useEffect, useRef, useState, type ChangeEvent, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Menu, Plus, Trash, X } from "lucide-react";
import {
  BannerSlideData,
  ButtonData,
  FormFieldData,
  SectionData,
  SocialLinkData,
} from "../../types/section";
import { getSectionComponent } from "../../lib/sectionRegistry";
import {
  EventsSubsectionLayoutPreview,
  getEventsSubsectionLayouts,
} from "../../lib/eventsSubsectionLayouts";
import {
  NGOSubsectionLayoutPreview,
  getNGOSubsectionLayouts,
} from "../../lib/ngoSubsectionLayouts";
import {
  MAX_EVENTS_CAREERS_FORM_FIELDS,
  resolveEventsCareersApplyForm,
} from "../../lib/eventsCareersApplyForm";
import {
  getCategoryLayoutOptions,
  getCategoryPageLayoutOptions,
  getCategoryVariantData,
} from "../../data/templateFlow";
import { PageLink, usePreview } from "../context/PreviewContext";
import { ngoIconOptions, ngoSocialIconOptions } from "../../lib/ngoIcons";

type MenuItem = {
  label: string;
  href: string;
  children?: MenuItem[];
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
const MAX_FOOTER_LINKS_PER_COLUMN = 10;
const MAX_PROPERTY_PROCESS_STEPS = 4;
const MAX_NGO_FRENCHISE_FORM_FIELDS = 11;
const MAX_NGO_ENQUIRY_FORM_FIELDS = 10;
const MAX_NGO_CONTACT_FORM_FIELDS = 8;
const MAX_EVENTS_CONTACT_FORM_FIELDS = 10;
const MAX_NGO_ENQUIRY_LEFT_FEATURES = 5;
const MAX_NGO_ENQUIRY_CONTACT_ITEMS = 5;

type EditSectionModalProps = {
  category: string;
  sectionId: string;
  sectionType: string;
  subsectionScope?: {
    index: number;
    label: string;
    content: string;
    fields?: string[];
    formTabFields?: string[];
    cardFields?: string[];
    fieldValues?: Record<string, string>;
    hasCardLayout?: boolean;
  } | null;
  sections: SectionItem[];
  onClose: () => void;
  onSave: (sectionType: string) => void;
  onSelectVariant: (type: string, variant: string) => void;
  onUpdateSectionData: (
    type: string,
    newData: Record<string, SectionData>,
  ) => void;
  onDeleteSection?: () => void;
};

const normalizeScopeContent = (value: string) =>
  value.toLowerCase().replace(/\s+/g, " ").trim();

const getNextPropertySlug = (items: unknown[]) => {
  const existingSlugs = new Set(
    items.flatMap((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return [];
      const slug = (item as Record<string, unknown>).slug;
      return typeof slug === "string" ? [slug] : [];
    }),
  );
  let suffix = 1;

  while (existingSlugs.has(`new-property-${suffix}`)) suffix += 1;

  return `new-property-${suffix}`;
};

const getNextProjectSlug = (items: unknown[]) => {
  const existingSlugs = new Set(
    items.flatMap((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return [];
      const slug = (item as Record<string, unknown>).slug;
      return typeof slug === "string" ? [slug] : [];
    }),
  );
  let suffix = 1;

  while (existingSlugs.has(`new-project-${suffix}`)) suffix += 1;

  return `new-project-${suffix}`;
};

const valueAppearsInSubsection = (value: unknown, content: string): boolean => {
  if (typeof value === "string") {
    const normalizedValue = normalizeScopeContent(value);
    return normalizedValue.length > 0 && content.includes(normalizedValue);
  }

  if (Array.isArray(value)) {
    return value.some((item) => valueAppearsInSubsection(item, content));
  }

  if (value && typeof value === "object") {
    return Object.values(value).some((item) =>
      valueAppearsInSubsection(item, content),
    );
  }

  return false;
};

const aboutPageLayouts = [
  { id: "AboutPage-1", name: "About Page" },
  { id: "AboutPage-2", name: "About Page Two" },
  { id: "AboutPage-3", name: "About Page Three" },
];

const galleryPageLayouts = [{ id: "GalleryPage-1", name: "Gallery Page" }];

const servicePageLayouts = [{ id: "ServicePage-1", name: "Service Page" }];

const contactPageLayouts = [
  { id: "ContactPage-1", name: "Contact Page" },
  { id: "ContactPage-2", name: "Contact Page Two" },
];

const pageLayoutsBySection: Record<string, { id: string; name: string }[]> = {
  About: aboutPageLayouts,
  AboutPage: aboutPageLayouts,
  AboutUsPage: aboutPageLayouts,
  Service: servicePageLayouts,
  Gallery: galleryPageLayouts,
  Contact: contactPageLayouts,
};

const eventsInnerPagesWithoutPageLayout = new Set(["Contact"]);

const eventsBreadcrumbManagedFields = new Set([
  "breadcrumbBackgroundType",
  "breadcrumbColorBackgroundType",
  "backgroundImage",
  "backgroundColor",
  "breadcrumbGradientColor",
  "textColor",
]);

const MAX_MENU_LINKS = 7;
const MAX_DROPDOWN_LINKS = 10;
const MAX_TOPBAR_SOCIAL_LINKS = 5;
const MAX_HEADER_BUTTONS = 3;
const MAX_BANNER_BUTTONS = 3;
const MAX_FORM_FIELDS = 5;
const MAX_FEATURE_CARDS = 4;
const MAX_BLOG_CARDS = 20;
const MAX_LINK_TEXT_LENGTH = 20;
const DEFAULT_WHATSAPP_LINK = "https://api.whatsapp.com/send?phone=962786336414";
const DEFAULT_CALL_LINK = "tel:+919876543210";

const toPageLinks = (menu: MenuItem[], limit = MAX_MENU_LINKS): PageLink[] =>
  menu.slice(0, limit).map((item) => ({
    label: item.label,
    href: item.href,
    children: item.children
      ? toPageLinks(item.children, MAX_DROPDOWN_LINKS)
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

  if (normalizedKey === "poster" || normalizedKey === "src" || normalizedKey === "logo") {
    return "image";
  }
  if (/image\d*$/.test(normalizedKey)) {
    return "image";
  }
  if (/video\d*$/.test(normalizedKey)) {
    return "video";
  }

  return null;
};

const getMediaUploadLabel = (value: string, mediaKind: "image" | "video") => {
  if (!value) return `Choose ${mediaKind}`;

  return value.startsWith("data:")
    ? "Selected from desktop"
    : `Current ${mediaKind}`;
};

const socialLinkLabels: SocialLinkData["label"][] = [
  "facebook",
  "instagram",
  "twitter",
  "linkedin",
  "youtube",
  "pinterest",
];

const MAX_FOOTER_SOCIAL_LINKS = 6;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const iconFieldOptions = [
  { value: "IconAward", label: "Award" },
  { value: "IconArrowRight", label: "Arrow Right" },
  { value: "IconBriefcase", label: "Briefcase" },
  { value: "IconBuildingStore", label: "Building / Store" },
  { value: "IconBulb", label: "Bulb" },
  { value: "IconCalendar", label: "Calendar" },
  { value: "IconCamera", label: "Camera" },
  { value: "IconCoin", label: "Coin" },
  { value: "IconFileText", label: "File" },
  { value: "IconHeart", label: "Heart" },
  { value: "IconHeartHandshake", label: "Heart Handshake" },
  { value: "IconMusic", label: "Music" },
  { value: "IconRibbon", label: "Ribbon / Medal" },
  { value: "IconRings", label: "Rings" },
  { value: "IconRocket", label: "Rocket" },
  { value: "IconShieldCheck", label: "Shield Check" },
  { value: "IconSparkles", label: "Sparkles" },
  { value: "IconStar", label: "Star" },
  { value: "IconTarget", label: "Target" },
  { value: "IconTrendingUp", label: "Trending Up" },
  { value: "IconTrophy", label: "Trophy" },
  { value: "IconUsers", label: "Users" },
  { value: "IconWorld", label: "World" },
  { value: "Award", label: "Award" },
  { value: "Calendar", label: "Calendar" },
  { value: "ChefHat", label: "Chef Hat" },
  { value: "Heart", label: "Heart" },
  { value: "MapPin", label: "Map Pin" },
  { value: "Music", label: "Music" },
  { value: "Presentation", label: "Presentation" },
  { value: "Shield", label: "Shield" },
  { value: "Smile", label: "Smile" },
  { value: "Sparkles", label: "Sparkles" },
  { value: "Ticket", label: "Ticket" },
  { value: "Users", label: "Users" },
  { value: "delivery", label: "Delivery" },
  { value: "email", label: "Email" },
  { value: "location", label: "Location" },
  { value: "phone", label: "Phone" },
  { value: "send", label: "Send" },
  { value: "shield", label: "Shield" },
  { value: "support", label: "Support" },
  { value: "users", label: "Users" },
  { value: "verified", label: "Verified" },
  { value: "→", label: "Arrow" },
];


const sidebarItemsBySection: Record<string, string[]> = {
  Topbar: ["Topbar Layout", "Topbar Content"],
  Header: ["Header Content", "Header Layout", "Navigation Menu"],
  Banner: ["Banner Content", "Banner Layout"],
  About: ["About Content", "About Layout"],
  AboutPage: ["AboutPage Content", "AboutPage Layout"],
  AboutUsPage: ["AboutUsPage Content", "AboutUsPage Layout"],
  Service: ["Service Content", "Service Layout"],
  Product: ["Product Content", "Product Layout"],
  WhyChooseUs: ["WhyChooseUs Content", "WhyChooseUs Layout"],
  Gallery: ["Gallery Content", "Gallery Layout"],
  Contact: ["Contact Content", "Contact Layout"],
  FAQ: ["FAQ Content", "FAQ Layout"],
  Testimonial: ["Our Clients Content", "Our Clients Layout"],
  Awards: ["Awards Content", "Awards Layout"],
  AwardsPage: ["Awards Content", "Awards Layout"],
  Blog: ["Blog Content", "Blog Layout"],
  BlogPage: ["Blog Content", "Blog Layout"],
  CompanyStatistics: ["Statistics Content", "Statistics Layout"],
  CareerPage: ["CareerPage Content", "CareerPage Form"],
  Careers: ["Careers Content", "Careers Layout"],
  FormDetail: ["Form Content", "Form Layout"],
  PopularEvents: ["PopularEvents Content"],
  Team: ["Team Content"],
  Causes: ["Causes Content", "Causes Layout"],
  Projects: ["Projects Content", "Projects Layout"],
  ProjectsPage: ["Projects Content", "Projects Layout"],
  Industry: ["Industry Content", "Industry Layout"],
  Branches: ["Branches Content", "Branches Layout"],
  Events: ["Events Content", "Events Layout"],
  EventsPage: ["Events Content", "Events Layout"],
  Cta: ["CTA Content", "CTA Layout"],
  Footer: ["Footer Layout", "Footer Content", "External Link"],
};

const componentContentFieldsByVariant: Record<string, string[]> = {
  "Features-1": ["features"],
  "Highlight-1": ["categoriesPretitle", "categoriesTitle", "categoriesDesc", "categories"],
  "Featured-1": ["subtitle", "sectionTitle", "title", "description", "desc", "listings"],
  "LatestProjects-1": ["pretitle", "title", "desc", "projectItems", "button"],
  "CitiesWeServe-1": ["pretitle", "title", "desc", "cities", "tabs", "button"],
  "FeaturedDevelopers-1": ["pretitle", "title", "desc", "items"],
  "FeaturedDevelopers-2": ["pretitle", "title", "desc", "items"],
  "FeaturedDevelopers-3": ["pretitle", "title", "desc", "items"],
  "PropertyProcess-1": ["pretitle", "title", "desc", "steps", "button"],
  "InvestmentOpportunities-1": ["pretitle", "title", "desc", "items", "button"],
  "Contact-1": ["pretitle", "title", "desc", "backgroundImage", "backgroundImageTitle", "formFields", "formSubmitLabel", "successMessage"],
  "EventsContact1": [
    "pretitle",
    "title",
    "desc",
    "leftBadge",
    "leftTitle",
    "leftDesc",
    "features",
    "ctaLabel",
    "ctaHref",
    "form",
  ],
  "About-1": ["pretitle", "title", "desc", "backgroundImage", "backgroundImageTitle", "buttons"],
  "EventsAbout1": [
    "pretitle",
    "title",
    "subtitle",
    "desc",
    "desc2",
    "sideImage",
    "sideImageTitle",
    "buttons",
    "stats",
  ],
  "NGOAbout2": [
    "badge",
    "title",
    "desc",
    "buttons",
    "trustBadges",
    "gallery",
    "statistics",
    "background",
  ],
  "NGOMission2": [
    "badge",
    "title",
    "tabs",
    "imageSection",
  ],
  "NGOWhyChooseUs2": [
    "badge",
    "title",
    "desc",
    "image",
    "imageAlt",
    "imageOverlay",
    "cards",
  ],
  "NGOServicesContent2": [
    "pretitle",
    "title",
    "desc",
    "items",
  ],
  "NGOServicesCta2": ["callToAction"],
  "NGOTeam2": [
    "pretitle",
    "title",
    "desc",
    "members",
  ],
  "NGOTeamCta2": ["cta"],
  "NGOTeamDetailProfile2": [
    "name",
    "role",
    "bio",
    "image",
    "stats",
    "contactInfo",
    "socialLinks",
  ],
  "NGOTeamDetailAbout2": ["about", "skills"],
  "NGOTeamDetailExperience2": ["experience"],
  "NGOTeamDetailAchievements2": ["achievements"],
  "NGOMediaContent2": ["sectionTitle", "mediaCards"],
  "NGOIndustryContent2": [
    "pretitle",
    "title",
    "desc",
    "sectionTag",
    "sectors",
  ],
  "NGOIndustryPartner2": [
    "partnerTitle",
    "partnerTitleHighlight",
    "partnerDesc",
    "partnerButton",
    "metrics",
  ],
  "NGOIndustryPage2": [
    "pretitle",
    "title",
    "desc",
    "sectionTag",
    "sectors",
  ],
  "NGOBranchesContent2": ["pretitle", "title", "desc", "stats"],
  "NGOBranchesLocations2": [
    "locationsLabel",
    "locationsTitle",
    "branches",
    "mapImage",
  ],
  "NGOBranchesCta2": [
    "ctaLabel",
    "ctaTitle",
    "ctaDesc",
    "ctaPrimaryButton",
    "ctaSecondaryButton",
    "ctaImage",
  ],
  "NGOBranchesContact2": ["contactItems"],
  "NGOBranchesPage2": ["pretitle", "title", "desc", "stats"],
  "NGOAwardsContent2": ["pretitle", "title", "desc", "stats"],
  "NGOAwardsGrid2": ["awardsLabel", "awardsTitle", "awards"],
  "NGOAwardsSupport2": [
    "supportLabel",
    "supportTitle",
    "supportTitleHighlight",
    "supportDesc",
    "supportButton",
    "supportImage",
  ],
  "NGOAwardsTransparency2": [
    "transparencyTitle",
    "transparencyDesc",
    "transparencyButton",
  ],
  "NGOAwardsPage2": ["pretitle", "title", "desc", "stats"],
  "NGOCareersOverview2": ["title", "desc", "benefits"],
  "NGOCareersRoles2": ["rolesTitle", "rolesApplyLabel", "jobs"],
  "NGOCareersCta2": ["ctaTitle", "ctaDesc", "ctaButton"],
  "NGOCareersPage2": ["title", "desc", "benefits"],
  "NGOCauses2": [
    "pretitle",
    "title",
    "desc",
    "items",
    "exploreButton",
    "showExploreButton",
  ],
  "NGOProjects2": [
    "pretitle",
    "title",
    "desc",
    "items",
    "exploreButton",
    "showExploreButton",
  ],
  "NGOProjectsPage2": [
    "pretitle",
    "title",
    "desc",
    "items",
  ],
  "NGOEvents2": [
    "pretitle",
    "title",
    "desc",
    "events",
    "exploreButton",
    "showExploreButton",
  ],
  "NGOTestimonial2": [
    "pretitle",
    "title",
    "desc",
    "testimonials",
  ],
  "NGOBlog2": [
    "pretitle",
    "title",
    "desc",
    "articles",
    "exploreButton",
    "showExploreButton",
  ],
  "NGOGallery2": [
    "pretitle",
    "title",
    "desc",
    "categories",
    "images",
  ],
  "NGOGalleryPage2": [
    "pretitle",
    "title",
    "desc",
    "categories",
    "images",
  ],
  "NGOContact2": ["office", "contactItems", "form"],
  "NGOContactOverview2": ["office", "contactItems", "form"],
  "NGOContactFeatures2": ["cards"],
  "NGOContactMap2": ["mapEmbedUrl"],
  "NGOContactPage2": ["office", "form", "cards", "mapEmbedUrl"],
  "NGOFrenchiseIntro2": ["pretitle", "title", "desc", "features"],
  "NGOFrenchiseForm2": [
    "leftPretitle",
    "leftTitle",
    "leftDesc",
    "leftPoints",
    "leftImage",
    "leftImageAlt",
    "formTitle",
    "formPretitle",
    "form",
  ],
  "NGOFrenchiseProcess2": ["processPretitle", "processTitle", "steps"],
  "NGOFrenchiseCta2": [
    "ctaTitle",
    "ctaPretitle",
    "ctaDesc",
    "ctaPhone",
    "ctaEmail",
    "ctaHours",
    "ctaImage",
    "ctaImageAlt",
  ],
  "NGOFrenchisePage2": ["pretitle", "title", "desc", "features"],
  "NGOEnquiryIntro2": ["pretitle", "title", "desc"],
  "NGOEnquiryForm2": [
    "pretitle",
    "title",
    "desc",
    "leftTitle",
    "leftDesc",
    "leftFeatures",
    "leftImage",
    "leftImageAlt",
    "formTitle",
    "form",
  ],
  "NGOEnquiryContact2": [
    "contactTitle",
    "contactPretitle",
    "contactDesc",
    "contactItems",
  ],
  "NGOEnquiryCta2": [
    "ctaIcon",
    "ctaText",
    "ctaSubtext",
    "ctaButtonLabel",
    "ctaButtonHref",
    "ctaButtonIcon",
  ],
  "NGOEnquiryPage2": [
    "pretitle",
    "title",
    "desc",
    "leftTitle",
    "leftDesc",
    "leftFeatures",
    "leftImage",
    "leftImageAlt",
    "formTitle",
    "form",
  ],
  "NGOSupportIntro2": ["pretitle", "title", "desc", "values"],
  "NGOSupportOverview2": ["pretitle", "title", "desc", "values"],
  "NGOSupportWays2": ["waysPretitle", "waysTitle", "supportCards"],
  "NGOSupportImpact2": [
    "impactPretitle",
    "impactTitle",
    "stats",
    "closingText",
  ],
  "NGOSupportCta2": [
    "ctaPretitle",
    "ctaTitle",
    "ctaDesc",
    "ctaImage",
    "ctaPrimaryButton",
    "ctaSecondaryButton",
  ],
  "NGOSupportTransparency2": [
    "transparencyIcon",
    "transparencyTitle",
    "transparencyDesc",
    "transparencyButton",
  ],
  "NGOSupportPage2": ["pretitle", "title", "desc", "values"],
  "NGOFAQ2": ["pretitle", "title", "desc", "questions"],
  "NGOFAQContent2": ["pretitle", "title", "desc", "questions"],
  "NGOFAQPage2": ["pretitle", "title", "desc", "questions"],
  "NGOPartners2": ["pretitle", "title", "desc", "partnersList"],
  "NGOPartnersContent2": ["pretitle", "title", "desc", "partnersList"],
  "NGOPartnersPage2": ["pretitle", "title", "desc", "partnersList"],
  "NGOCsrIntro2": ["pretitle", "title", "desc", "stats"],
  "NGOCsrFocus2": ["focusPretitle", "focusItems"],
  "NGOCsrImpact2": ["impactPretitle", "impactDesc", "impactButton", "pillars"],
  "NGOCsrProjects2": ["projectsPretitle", "csrProjectItems"],
  "NGOCsrCta2": ["ctaTitle", "ctaDesc", "ctaButton"],
  "NGOCsrValues2": ["coreValueItems"],
  "NGOCsrPage2": ["pretitle", "title", "desc", "stats"],
  "NGOTestimonialsContent2": [
    "pretitle",
    "title",
    "highlight",
    "desc",
    "testimonials",
  ],
  "NGOTestimonialsPage2": ["pretitle", "title", "highlight", "desc", "testimonials"],
  "NGOBrochureIntro2": ["pretitle", "title", "desc", "features"],
  "NGOBrochureList2": ["listPretitle", "listTitle", "brochures"],
  "NGOBrochureCta2": [
    "ctaPretitle",
    "ctaTitle",
    "ctaDesc",
    "ctaPrimaryButton",
    "ctaSecondaryButton",
    "ctaStats",
  ],
  "NGOBrochurePage2": ["pretitle", "title", "desc", "features"],
  "NGORefundContent2": ["conditions"],
  "NGORefundPolicyPage2": ["conditions"],
  "NGOPrivacyContent2": ["conditions"],
  "NGOPrivacyPolicyPage2": ["conditions"],
  "NGOTermsContent2": ["conditions"],
  "NGOTermsConditionPage2": ["conditions"],
  "NGOCookieContent2": ["conditions"],
  "NGOCookiePolicyPage2": ["conditions"],
  "NGODisclaimerContent2": ["conditions"],
  "NGODisclaimerPage2": ["conditions"],
  "NGOCaseStudyContent2": [
    "pretitle",
    "title",
    "desc",
    "items",
  ],
  "NGOCaseStudyOverview2": [
    "pretitle",
    "title",
    "desc",
    "items",
  ],
  "NGOCaseStudyCta2": ["ctaTitle", "ctaDesc", "ctaButton"],
  "NGOCaseStudyPage2": [
    "pretitle",
    "title",
    "desc",
    "items",
  ],
  "NGOCaseDetailsArticle2": [
    "pageTitle",
    "primaryTitle",
    "primaryImage",
    "primaryImageAlt",
    "primaryParagraphs",
    "postedOn",
    "secondaryTitle",
    "secondaryParagraphs",
  ],
  "NGOCaseDetailsSidebar2": [
    "popularPostsTitle",
    "popularPosts",
  ],
  "NGOCaseDetailsContent2": [
    "pageTitle",
    "primaryTitle",
    "primaryImage",
    "primaryImageAlt",
    "primaryParagraphs",
    "postedOn",
    "secondaryTitle",
    "secondaryParagraphs",
    "popularPostsTitle",
    "popularPosts",
  ],
  "NGOCaseDetailsPage2": [
    "pageTitle",
    "primaryTitle",
    "primaryImage",
    "primaryImageAlt",
    "primaryParagraphs",
    "postedOn",
    "secondaryTitle",
    "secondaryParagraphs",
    "popularPostsTitle",
    "popularPosts",
  ],
  "NGOCta2": ["title", "desc", "button"],
  "About-2": ["pretitle", "title", "subtitle", "desc", "backgroundImage", "backgroundImageTitle", "sideImage", "sideImageTitle", "philosophyTitle", "philosophyDesc", "buttons"],
  "AboutPage-1": ["pretitle", "title", "subtitle", "desc", "desc2", "sideImage", "sideImageTitle", "philosophyTitle", "philosophyDesc", "buttons"],
  "AboutPage-2": ["pretitle", "title", "desc", "desc2", "sideImage", "sideImageTitle"],
  "AboutPage-3": ["pretitle", "title", "subtitle", "desc", "desc2", "philosophyTitle", "philosophyDesc"],
  "ServicePage-1": ["pretitle", "title", "subtitle", "desc", "desc2", "sideImage", "sideImageTitle", "productSectionTitle", "productItems", "productSlides"],
  "Product-1": ["productSlides", "productFeatures", "productTotalPrice", "productShippingText"],
  "Product-2": ["productSectionTitle", "productItems"],
  "Product-3": ["pretitle", "title", "desc", "buttons", "productItems"],
  "WhyChooseUs-1": ["pretitle", "title", "desc", "whyChooseUsItems"],
  "WhyChooseUs-2": ["title", "whyChooseUsItems"],
  "WhyChooseUs-3": ["title", "whyChooseUsItems"],
  "WhyChooseUs-4": ["title", "whyChooseUsItems"],
  "PopularEvents-1": [
    "pretitle",
    "title",
    "desc",
    "description",
    "tabs",
    "buttonLabel",
    "buttonIcon",
    "events",
  ],
  "EventsPopularEvents1": [
    "pretitle",
    "title",
    "desc",
    "description",
    "tabs",
    "buttonLabel",
    "buttonIcon",
    "events",
  ],
  "Gallery-1": ["title", "desc", "galleryItems"],
  "Gallery-2": ["title", "galleryItems"],
  "Gallery-3": ["title", "galleryItems"],
  "Gallery-4": ["pretitle", "title", "desc", "galleryItems"],
  "Gallery-5": ["title", "desc", "galleryItems"],
  "Gallery-6": ["title", "galleryItems"],
  "GalleryPage-1": ["pretitle", "title", "desc", "galleryItems"],
  "ContactPage-1": ["pretitle", "title", "desc", "sideImage", "sideImageTitle", "footerContact", "formFields", "formSubmitLabel"],
  "ContactPage-2": ["pretitle", "title", "desc", "footerContact", "formFields", "formSubmitLabel"],
  "FAQ-1": ["pretitle", "title", "desc", "faqItems"],
  "FAQ-2": ["title", "faqItems"],
  "FAQ-3": ["title", "faqItems"],
  "FAQ-4": ["title", "faqItems"],
  "Testimonial-1": ["pretitle", "title", "desc", "testimonialItems"],
  "Testimonial-2": ["pretitle", "title", "desc", "testimonialItems"],
  "Testimonial-3": ["pretitle", "title", "testimonialItems"],
  "Awards-1": ["pretitle", "title", "desc", "awardItems", "button"],
  "Awards-2": ["pretitle", "title", "desc", "awardItems", "button"],
  "Awards-3": ["pretitle", "title", "desc", "awardItems", "button"],
  "Blog-1": ["pretitle", "title", "desc", "blogItems", "buttons"],
  "CompanyStatistics-1": ["stats"],
  "CompanyStatistics-2": ["stats"],
  "CompanyStatistics-3": ["stats"],
  "FormDetail-1": ["pretitle", "title", "desc", "backgroundImage", "backgroundImageTitle", "sideImage", "galleryItems", "formFields", "formSubmitLabel"],
  "FormDetail-2": ["title", "formFields", "formSubmitLabel"],
  "FormDetail-3": ["title", "desc", "phone", "email", "location", "formFields", "formSubmitLabel"],
  "FormDetail-4": ["title", "desc", "formFields", "formSubmitLabel"],
  "RealEstateAboutPage1": ["pretitle", "title", "desc", "subtitle", "sideImage", "backgroundImage", "sideImageTitle", "desc2", "philosophyTitle", "philosophyDesc", "promises", "buttons", "stats"],
  "EventsAboutPage1": [
    "pretitle",
    "title",
    "subtitle",
    "backgroundImage",
    "breadcrumb",
    "description",
    "description1",
    "quote",
    "image",
    "imageAlt",
    "description2",
    "description3",
    "quoteRole",
    "image2",
    "image2Alt",
    "stats",
    "values",
    "cta"
  ],
  "EventsBlogPage1": [
    "title",
    "subtitle",
    "backgroundImage",
    "breadcrumb",
    "blogItems",
    "buttonLabel",
    "buttonIcon",
  ],
  "EventsCareersPage1": [
    "pretitle",
    "title",
    "subtitle",
    "backgroundImage",
    "breadcrumb",
    "description",
    "description2",
    "heroImage",
    "heroImageAlt",
    "stats",
    "rolesPretitle",
    "rolesTitle",
    "rolesApplyLabel",
    "roles",
    "quote",
    "quoteAuthor",
    "ctaLabel",
    "ctaHref",
  ],
  "EventsTeamsPage1": [
    "title",
    "subtitle",
    "backgroundImage",
    "breadcrumb",
    "textColor",
    "backgroundColor",
    "departments",
    "members",
    "joinTitle",
    "joinDescription",
    "joinButton1",
  ],
  "EventsCareersApplyPage1": [
    "backgroundImage",
    "breadcrumb",
    "title",
    "department",
    "location",
    "type",
    "experience",
    "postedOn",
    "description",
    "applyForm",
    "whyJoinUs",
  ],
  "EventsContactPage1": [
    "title",
    "subtitle",
    "backgroundImage",
    "breadcrumb",
    "contactItems",
    "form",
    "mapEmbedUrl",
  ],
  "EventsCaseStudyPage1": [
    "title",
    "subtitle",
    "backgroundImage",
    "breadcrumb",
    "featuredImage",
    "featuredImageAlt",
    "stats",
    "highlightsTitle",
    "highlights",
    "projectTitle",
    "projectDescription",
    "projectPoints",
    "ctaTitle",
    "ctaLabel",
    "ctaHref",
  ],
  "EventsSupportPage1": [
    "title",
    "subtitle",
    "heroSubtitle",
    "backgroundImage",
    "breadcrumb",
    "contactPretitle",
    "contactTitle",
    "contactDescription",
    "contactItems",
    "faqPretitle",
    "faqTitle",
    "faqItems",
  ],
  "EventsPrivacyPolicyPage1": [
    "title",
    "subtitle",
    "backgroundImage",
    "breadcrumb",
    "sections",
  ],
  "EventsTermsConditionPage1": [
    "title",
    "subtitle",
    "backgroundImage",
    "breadcrumb",
    "sections",
  ],
  "RealEstateAwardsPage1": ["pretitle", "title", "desc", "awardItems"],
  "RealEstateBlogPage1": ["pretitle", "title", "desc", "blogItems", "galleryItems"],
  "RealEstateCareerPage1": ["pretitle", "title", "desc", "desc2", "benefits", "jobs", "formPretitle", "formTitle", "formFields", "applyLabel", "successTitle", "successDesc", "successButtonLabel"],
  "RealEstateContactPage1": ["pretitle", "title", "desc", "footerContact", "formFields", "formSubmitLabel", "successMessage"],
  "RealEstateCSRPage1": ["pretitle", "title", "desc", "sideImage", "sideImageTitle", "impactStats", "programs", "donateCta"],
  "RealEstateMissionVision1": ["pretitle", "title", "desc", "desc2", "sideImage", "sideImageTitle", "pillarsPretitle", "pillarsTitle", "pillars", "valuesPretitle", "valuesTitle", "values"],
  "RealEstateSitemap1": ["pretitle", "title", "desc", "groups"],
  "RealEstateServicePage1": ["pretitle", "title", "desc", "subtitle", "sideImage", "sideImageTitle", "productSectionTitle", "productSlides"],
  "RealEstateGalleryPage1": ["pretitle", "title", "desc", "galleryItems"],
  "RealEstateProject1": ["pretitle", "title", "desc", "projectItems", "tabs"],
  "RealEstateProjectDetail1": ["homeLabel", "projectsLabel", "title", "desc", "description", "body", "image", "alt", "category", "status", "statusText", "location", "ctaLabel", "ctaHref", "backLabel"],
  "RealEstateRent1": [
    "pretitle",
    "title",
    "desc",
    "allPropertiesLabel",
    "forSaleLabel",
    "forRentLabel",
    "cityLabel",
    "allCitiesLabel",
    "resultsLabel",
    "emptyMessage",
    "listings",
  ],
  "RealEstateProperty1": [
    "pretitle",
    "title",
    "desc",
    "searchPlaceholder",
    "propertyTypeAllLabel",
    "listingsPretitle",
    "listingsTitle",
    "resultsLabel",
    "emptyMessage",
    "listings",
  ],
  "RealEstateBlogDetail1": ["pretitle", "title", "date", "body", "excerpt", "image", "primaryButtonLabel", "primaryButtonHref", "secondaryButtonLabel", "secondaryButtonHref"],
  "RealEstatePropertyDetail1": ["title", "subtitle", "description", "body", "image", "alt", "category", "statusText", "price", "infoTitle", "features", "amenities", "button"],
  "RealEstatePrivacyPolicy1": ["pretitle", "title", "desc", "updatedAt", "sections"],
  "RealEstateTermsConditions1": ["pretitle", "title", "desc", "updatedAt", "sections"],
  "RealEstateDisclaimer1": ["pretitle", "title", "desc", "updatedAt", "sections"],
  "RealEstateCookiePolicy1": ["pretitle", "title", "desc", "updatedAt", "sections"],
  "RealEstateRefundPolicy1": ["pretitle", "title", "desc", "updatedAt", "sections"],
};

const innerPageContentDefaultsByVariant: Record<string, SectionData> = {
  BusinessAboutPage1: {
    principles: [
      { title: "Exceptional materials", desc: "Silks selected for their texture, movement, and enduring finish." },
      { title: "Precise craftsmanship", desc: "Every seam, fastening, and silhouette is considered by hand." },
      { title: "Modern elegance", desc: "Heritage techniques shaped into pieces made for life today." },
    ],
    ctaPretitle: "Private consultation",
    ctaTitle: "Discover a piece shaped around you.",
    ctaLabel: "Book a consultation",
    ctaHref: "/contact",
  },
  RealEstateAboutPage1: {
    promises: [
      "Verified property information",
      "Clear pricing and local context",
      "Guided visits with local advisors",
      "Support from shortlist to closing",
    ],
    ctaPretitle: "Start your search",
    ctaTitle: "Let us help you find the right next move.",
    ctaPrimaryLabel: "Browse properties",
    ctaPrimaryHref: "/buy-a-property",
    ctaSecondaryLabel: "Contact us",
    ctaSecondaryHref: "/contact",
  },
  RealEstateServicePage1: {
    ctaPretitle: "Personal guidance",
    ctaTitle: "Tell us what you are looking for.",
    ctaLabel: "Contact us",
    ctaHref: "/contact",
  },
  RealEstateAwardsPage1: {
    contentPretitle: "Our honours",
    contentTitle: "Awards that mark how we work",
  },
  RealEstateBlogPage1: {
    postsPretitle: "Market journal",
    postsTitle: "Stories to guide your next move.",
    readArticleLabel: "Read article",
  },
  RealEstateBlogDetail1: {
    homeLabel: "Home",
    blogLabel: "Blog",
  },
  RealEstateCareerPage1: {
    jobsPretitle: "Open positions",
    jobsTitle: "Find your next role at HAUS Group.",
  },
  RealEstateContactPage1: {
    contactPretitle: "Reach our advisors",
    contactTitle: "We are ready to help with your next move.",
    phoneLabel: "Phone",
    emailLabel: "Email",
    officeLabel: "Office",
    successTitle: "Message received.",
    successMessage: "Thank you. A HAUS Group advisor will contact you shortly.",
    successButtonLabel: "Send another message",
    formPretitle: "Property enquiry",
    formTitle: "Tell us what you are looking for.",
    consentText: "I agree that HAUS Group may contact me about this enquiry. See our",
    privacyPolicyLabel: "Privacy Policy",
  },
  RealEstateCSRPage1: {
    programsPretitle: "Our initiatives",
    programsTitle: "Practical support for stronger communities.",
    ctaPretitle: "Get involved",
  },
  RealEstateProject1: {
    resultsTitle: "Our projects",
    resultsLabel: "results",
    viewProjectLabel: "View project",
    emptyMessage: "No projects are available in this category.",
  },
  RealEstateProjectDetail1: {
    homeLabel: "Home",
    projectsLabel: "Projects",
    ctaLabel: "Enquire about this project",
    ctaHref: "/contact",
    backLabel: "All projects",
  },
  RealEstateProperty1: {
    pretitle: "Verified homes",
    title: "Buy a property with confidence.",
    desc: "Explore verified apartments, villas, floors, and studios across Delhi NCR.",
    searchPlaceholder: "Search by property or location",
    propertyTypeAllLabel: "All property types",
    listingsPretitle: "Properties",
    listingsTitle: "Homes for sale",
    resultsLabel: "listings",
    emptyMessage: "No properties match your search.",
  },
  RealEstateRent1: {
    pretitle: "Properties",
    title: "Featured Properties",
    desc: "Browse verified homes for sale and rent across Delhi NCR.",
    allPropertiesLabel: "All properties",
    forSaleLabel: "For Sale",
    forRentLabel: "For Rent",
    cityLabel: "City",
    allCitiesLabel: "All cities",
    resultsLabel: "results",
    emptyMessage: "No properties match this selection.",
  },
  RealEstatePropertyDetail1: {
    homeLabel: "Home",
    propertiesLabel: "Properties",
    primaryButtonLabel: "Book a visit",
    primaryButtonHref: "/contact",
    backButtonLabel: "All properties",
    amenitiesPretitle: "Amenities",
    amenitiesTitle: "What this property offers.",
    amenitiesDesc: "Everyday comforts and lifestyle facilities included with this listing.",
    amenities: [
      "Swimming Pool",
      "Gym / Fitness",
      "Covered Parking",
      "24×7 Security",
      "Power Backup",
      "High-Speed Wi-Fi",
      "Kids Play Area",
      "Landscaped Garden",
      "Clubhouse",
      "Elevator",
      "Laundry",
      "Visitor Parking",
    ],
  },
  RealEstatePrivacyPolicy1: {
    contactTitle: "Have a privacy question?",
    contactDescription: "Contact our team to review, update, or request deletion of the personal information you have shared with HAUS Group.",
    contactButtonLabel: "Contact us",
  },
  RealEstateTermsConditions1: {
    contactTitle: "Need help understanding these terms?",
    contactDescription: "Contact our team if you have a question about property information, enquiries, appointments, or your use of the HAUS Group website.",
    contactButtonLabel: "Contact us",
  },
  RealEstateDisclaimer1: {
    contactTitle: "Need clarification?",
    contactDescription: "Contact a HAUS Group advisor to verify listing details, availability, pricing, documentation, or any information shown on this website.",
    contactButtonLabel: "Contact us",
  },
  RealEstateCookiePolicy1: {
    contactTitle: "Have a cookie question?",
    contactDescription: "Contact HAUS Group if you need more information about cookies, analytics, or managing your website preferences.",
    contactButtonLabel: "Contact us",
  },
  RealEstateRefundPolicy1: {
    contactTitle: "Have a payment or refund question?",
    contactDescription: "Contact HAUS Group with the relevant service, payment, and transaction details so our team can review your request.",
    contactButtonLabel: "Contact us",
  },
};

const featuredListingContentFields = new Set([
  "image",
  "alt",
  "title",
  "subtitle",
  "description",
  "desc",
  "price",
  "category",
  "href",
]);

const latestProjectCardFields = new Set([
  "image",
  "status",
  "statusText",
  "location",
  "title",
  "desc",
  "description",
  "href",
]);
const portfolioHiddenFields = new Set(["region", "listingsLabel"]);
const propertyListingContentFields = new Set([
  "image",
  "statusText",
  "propertyType",
  "price",
  "title",
  "location",
  "description",
  "features",
  "href",
]);
const isPropertyCatalogSection = (sectionType: string) =>
  sectionType === "Listing" ||
  sectionType === "Rent" ||
  sectionType === "PropertyCatalog";
const defaultCareerFormFields = [
  { label: "Full name", name: "fullName", type: "text", placeholder: "Your full name" },
  { label: "Email", name: "email", type: "email", placeholder: "you@example.com" },
  { label: "Phone", name: "phone", type: "tel", placeholder: "Your phone number" },
  { label: "Position", name: "position", type: "text", placeholder: "General application", readOnly: true },
  { label: "Why are you interested?", name: "message", type: "textarea", placeholder: "Tell us about your experience" },
];
const careerPageFormContentFields = new Set([
  "formPretitle",
  "formTitle",
  "formFields",
  "applyLabel",
  "successTitle",
  "successDesc",
  "successButtonLabel",
]);
const EVENTS_CAREERS_FORM_TAB = "Career Form";
const eventsCareersFormContentFields = new Set(["applyForm"]);
const cardCollectionFields = new Set([
  "awardItems",
  "amenities",
  "benefits",
  "culture",
  "blogItems",
  "categories",
  "cities",
  "collectionItems",
  "features",
  "galleryItems",
  "groups",
  "impactStats",
  "items",
  "jobs",
  "listings",
  "productItems",
  "productSlides",
  "programs",
  "projectItems",
  "skills",
  "stats",
  "experience",
  "achievements",
  "mediaCards",
  "awards",
  "teamItems",
  "testimonialItems",
  "values",
  "whyChooseUsItems",
  "events",
  "testimonials",
  "articles",
  "images",
  "cards",
  "members",
  "milestones",
  "coreBeliefs",
  "points",
  "departments",
  "awards",
  "ctaItems",
  "content",
  "relatedPosts",
  "roles",
  "whyJoinUs",
  "contactItems",
  "highlights",
  "projectPoints",
  "sections",
  "tabs",
  "sectors",
  "metrics",
  "branches",
  "supportCards",
  "questions",
  "partnersList",
  "focusItems",
  "csrProjectItems",
  "pillars",
  "coreValueItems",
  "brochures",
  "ctaStats",
  "popularPosts",
  "leftPoints",
  "steps",
]);

const visibleCardFieldsByCollection: Record<string, string[]> = {
  awardItems: ["image", "year", "title", "org", "desc", "description", "href"],
  benefits: ["image", "title", "desc", "description"],
  buttons: ["label", "href", "variant", "icon"],
  culture: ["title", "description"],
  blogItems: ["image", "alt", "label", "title", "description", "excerpt", "desc", "date", "link", "href"],
  recentNews: ["image", "date", "title", "href"],
  categories: ["image", "name", "title", "label", "desc", "href"],
  cities: ["image", "name", "title", "category", "location", "desc", "href"],
  collectionItems: ["image", "eyebrow", "title", "desc", "description", "href"],
  features: ["icon", "image", "title", "label", "value", "desc", "description"],
  fields: ["placeholder", "type", "width"],
  galleryItems: ["image", "title", "desc", "description"],
  cards: ["image", "badge", "icon", "title", "desc", "description"],
  content: ["type", "text", "items", "primary", "secondary", "features"],
  tabs: ["id", "label", "icon", "active", "content"],
  ngoMissionTabItems: ["id", "label", "icon", "content"],
  ngoMissionFeatures: ["icon", "title", "description"],
  relatedPosts: ["image", "alt", "label", "title", "description", "link"],
  roles: ["title", "location", "type", "description"],
  whyJoinUs: ["icon", "title", "description"],
  contactItems: ["icon", "label", "value"],
  highlights: ["title", "description"],
  projectPoints: ["title", "description"],
  faqItems: ["question", "answer"],
  questions: ["question", "answer"],
  partnersList: ["logo", "name", "website"],
  focusItems: ["image", "icon", "title", "description"],
  csrProjectItems: ["image", "title", "description"],
  pillars: ["icon", "title", "description"],
  coreValueItems: ["icon", "title", "description"],
  brochures: ["image", "name", "description", "downloadlabel", "downloadUrl"],
  ctaStats: ["icon", "value", "label"],
  popularPosts: ["image", "date", "category", "title", "slug"],
  steps: ["icon", "title", "description" , "image", "desc"],
  sections: ["title", "content"],
  conditions: ["title", "content"],
  sectors: ["image", "icon", "title", "description"],
  metrics: ["icon", "value", "label"],
  branches: ["city", "address", "phone"],
  impactStats: ["image", "stat", "value", "label", "desc"],
  jobs: ["title", "location", "type", "desc"],
  productItems: ["image", "productTitle", "productSubtitle", "productInfoDesc", "productFeatures", "price", "link"],
  productSlides: ["image", "productTitle", "productSubtitle", "productInfoDesc", "productFeatures", "price", "link"],
  programs: ["image", "amount", "title", "desc", "description", "href"],
  projectItems: ["image", "status", "statusText", "category", "listingsLabel", "title", "location", "desc", "description", "href"],
  stats: ["stat", "value", "number", "label", "desc", "icon"],
  statistics: ["icon", "value", "label"],
  trustBadges: ["icon", "text", "desc"],
  teamItems: ["image", "name", "role", "title", "desc"],
  testimonials: ["image", "name", "designation", "rating", "message"],
  articles: ["image", "category", "date", "title", "description", "href"],
  testimonialItems: ["image", "name", "role", "quote", "rating", "initials", "address"],
  values: ["image", "number", "title", "desc", "description", "icon"],
  supportCards: ["icon", "title", "description", "button"],
  whyChooseUsItems: ["image", "icon", "stat", "title", "desc", "description"],
  events: [
    "image",
    "seats",
    "date",
    "location",
    "title",
    "desc",
    "description",
    "category",
    "link",
  ],
  images: ["src"],
  items: [
    "image",
    "icon",
    "category",
    "title",
    "titleLink",
    "description",
    "desc",
    "value",
    "button",
  ],
  milestones: ["year", "title", "description"],
  coreBeliefs: ["icon", "title", "description", "desc"],
  points: ["icon", "text"],
  breadcrumb: ["label", "href"],
  departments: ["label", "value"],
  awards: ["image", "title", "description", "year", "body", "category", "icon"],
  ctaItems: ["value", "label"],
  members: ["image", "name", "role", "department", "bio", "social"],
  socials: ["icon", "href"],
  skills: ["skill", "percentage", "title", "description"],
  experience: ["period", "role", "organization", "description"],
  achievements: ["title", "description"],
  mediaCards: ["image", "title", "articleUrl"],
};

const visibleObjectFieldsByKey: Record<string, string[]> = {
  vision: ["description", "detail", "image", "imageAlt", "points"],
  imageSection: ["mainImage", "purposeCard"],
  mainImage: ["src", "alt"],
  purposeCard: ["icon", "badge", "title"],
  callToAction: [
    "titlePrefix",
    "titleHighlight",
    "description",
    "buttonText",
    "buttonLink",
    "bannerImage",
  ],
  imageOverlay: ["icon", "text", "highlight"],
  mission: [
    "pretitle",
    "title",
    "description",
    "detail",
    "image",
    "imageAlt",
    "points",
  ],
  featuredAward: [
    "year",
    "title",
    "body",
    "description",
    "image",
    "imageAlt",
  ],
  ctaButton: ["label", "href"],
  impactButton: ["label", "href"],
  detailCtaButton: ["label", "href"],
  applyForm: [
    "title",
    "subtitle",
    "fields",
    "locations",
    "noticePeriods",
    "submitLabel",
    "successTitle",
    "successDescription",
    "backToCareersLabel",
    "homeLabel",
    "jobDetailsTitle",
    "whyJoinUsTitle",
  ],
  form: [
    "fields",
    "namePlaceholder",
    "emailPlaceholder",
    "subjectPlaceholder",
    "messagePlaceholder",
    "buttonLabel",
    "buttonIcon",
  ],
  leftContent: ["badge", "title", "description", "features", "cta"],
  badge: ["label", "icon"],
  title: ["line1", "highlight", "line2", "part1", "part2"],
  desc: ["primary", "secondary"],
  gallery: [
    "mainImage",
    "topImage",
    "sideImage",
    "playButton",
    "floatingCard",
  ],
  mainImage: ["src", "alt"],
  topImage: ["src", "alt"],
  sideImage: ["src", "alt"],
  playButton: ["videoUrl"],
  floatingCard: ["pretitle", "title", "highlight"],
  background: ["showDecorations"],
  image: ["src", "alt"],
  button: ["label", "href"],
  partnerButton: ["label", "href"],
  ctaPrimaryButton: ["label", "href"],
  ctaSecondaryButton: ["label", "href"],
  exploreButton: ["label", "href"],
  cta: ["title", "description", "button"],
  contactInfo: [
    "email",
    "phone",
    "location",
    "qualification",
    "languages",
  ],
  socialLinks: ["facebook", "linkedin", "twitter", "instagram", "youtube"],
};

const nonVisualContentFields = new Set([
  "breadcrumb",
  "detail",
  "filters",
  "intentMap",
  "pageIntent",
]);

const getComponentContentFields = (
  variant: string,
  sectionType: string,
  isPageSection: boolean,
) => {
  const exactFields = componentContentFieldsByVariant[variant];
  if (exactFields) return exactFields;

  const layoutNumber = variant.match(/(\d+)$/)?.[1] ?? "1";
  const baseSectionType = sectionType.replace(/Page$/i, "");
  const normalizedVariantKeys = isPageSection
    ? [`${baseSectionType}Page-${layoutNumber}`, `${baseSectionType}-${layoutNumber}`]
    : [`${baseSectionType}-${layoutNumber}`];

  return normalizedVariantKeys
    .map((key) => componentContentFieldsByVariant[key])
    .find(Boolean);
};

const normalizeSectionType = (sectionType: string) => {
  const normalized = sectionType.trim().toLowerCase();
  const aliases: Record<string, string> = {
    faq: "FAQ",
    faqs: "FAQ",
    formdetail: "FormDetail",
    testimonial: "Testimonial",
    whychooseus: "WhyChooseUs",
    latestprojects: "LatestProjects",
    citiesweserve: "CitiesWeServe",
    featureddevelopers: "FeaturedDevelopers",
    propertyprocess: "PropertyProcess",
    investmentopportunities: "InvestmentOpportunities",
    companystatistics: "CompanyStatistics",
    awardspage: "AwardsPage",
    aboutpage: "AboutPage",
    aboutuspage: "AboutUsPage",
    ourstory: "OurStory",
    visionmission: "VisionMission",
    teams: "Teams",
    teamdetail: "TeamDetail",
    globalpresence: "GlobalPresence",
    eventcategories: "EventCategories",
    eventdetail: "EventDetail",
    popularevents: "PopularEvents",
    blogdetails: "BlogDetails",
    careers: "Careers",
    careersapply: "CareersApply",
    careerpage: "CareerPage",
    blogpage: "BlogPage",
    blogdetail: "BlogDetail",
    csr: "CSR",
    csrpage: "CSRPage",
    brochure: "Brochure",
    brochurepage: "BrochurePage",
    casestudy: "CaseStudy",
    casestudypage: "CaseStudyPage",
    casedetails: "CaseDetails",
    casedetail: "CaseDetails",
    frenchise: "Frenchise",
    franchise: "Frenchise",
    enquiry: "Enquiry",
    enquirynow: "Enquiry",
    testimonialspage: "TestimonialsPage",
    contactpage: "ContactPage",
    missionvision: "MissionVision",
    privacypolicy: "PrivacyPolicy",
    privacy: "PrivacyPolicy",
    termsconditions: "TermsCondition",
    termscondition: "TermsCondition",
    terms: "TermsCondition",
    cookiepolicy: "CookiePolicy",
    cookie: "CookiePolicy",
    disclaimer: "Disclaimer",
    refundpolicy: "RefundPolicy",
    refund: "RefundPolicy",
    propertydetail: "PropertyDetail",
    projectdetail: "ProjectDetail",
    projectspage: "ProjectsPage",
    servicespage: "ServicesPage",
    teamspage: "TeamsPage",
    eventspage: "EventsPage",
    propertycatalog: "PropertyCatalog",
  };

  if (aliases[normalized]) return aliases[normalized];

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const getDefaultTab = (sectionType: string) =>
  sidebarItemsBySection[normalizeSectionType(sectionType)]?.[0] ??
  `${normalizeSectionType(sectionType)} Content`;

const getSubsectionContentTabName = (label: string) => {
  const trimmed = label.trim();
  if (!trimmed) return "";
  return /content$/i.test(trimmed) ? trimmed : `${trimmed} Content`;
};

const getSubsectionLayoutTabName = (label: string) => {
  const trimmed = label.trim();
  if (!trimmed) return "Layout";
  return /content$/i.test(trimmed)
    ? `${trimmed.replace(/\s*content$/i, "").trim()} Layout`
    : `${trimmed} Layout`;
};

const formatSectionTitle = (sectionType: string) => {
  const type = normalizeSectionType(sectionType);
  return type === "Cta" ? "CTA" : type;
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
  socialLinks?: unknown,
) => {
  if (!Array.isArray(socialLinks)) return [];

  return socialLinks
    .filter(
      (item): item is { label: SocialLinkData["label"]; href: string } =>
        typeof item === "object" &&
        item !== null &&
        "label" in item &&
        "href" in item,
    )
    .slice(0, MAX_TOPBAR_SOCIAL_LINKS);
};

const SelectedLayoutBadge = ({
  active,
  title,
}: {
  active: boolean;
  title: string;
}) => (
  <>
    {active && (
      <span className="absolute right-3 top-3 z-20 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-emerald-500 text-white shadow-lg">
        <Check size={16} strokeWidth={3} />
      </span>
    )}
    <span className="absolute bottom-2 left-2 right-2 z-20 truncate rounded-lg bg-white/95 px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm backdrop-blur">
      {title}
    </span>
  </>
);

const MediaUploadPreview = ({
  src,
  type,
}: {
  src: string;
  type: "image" | "video";
}) => (
  <div className="h-20 w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100 sm:w-32">
    {src ? (
      type === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <video src={src} className="h-full w-full object-cover" muted playsInline />
      )
    ) : (
      <div className="flex h-full items-center justify-center text-xs font-semibold text-slate-400">
        No {type}
      </div>
    )}
  </div>
);

type GenericFieldPath = Array<string | number>;

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
    address: true,
    phoneHref: true,
    headerCta: true,
    buttons: true,
    hiddenContentFields: true,
    socialLinks: {
      $items: { label: true, href: true },
    },
  },
  Header: {
    logo: true,
    logoImage: true,
    logoImageTitle: true,
    logoType: true,
    headerBackgroundType: true,
    headerType: true,
    headerBackgroundColor: true,
    headerGradientColor: true,
    headerTextColor: true,
    menu: true,
    header: true,
    PopupData: true,
    popupData: true,
    button: { label: true, href: true, variant: true },
    headerCta: { label: true, href: true },
    buttons: {
      $items: { label: true, href: true, variant: true },
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
      $items: { label: true, href: true, variant: true },
    },
    bannerSlides: {
      $items: {
        image: true,
        video: true,
        alt: true,
        title: true,
        pretitle: true,
        desc: true,
        overlayOpacity: true,
        bgImageUrl: true,
        ctaButtons: true,
        button: { label: true, href: true, variant: true },
        secondButton: { label: true, href: true, variant: true },
      },
    },
    slides: true,
    banner: true,
  },
  FormDetail: {
    pretitle: true,
    title: true,
    desc: true,
    formSubmitLabel: true,
    backgroundImage: true,
    backgroundImageTitle: true,
    sideImage: true,
    galleryItems: true,
    phone: true,
    email: true,
    location: true,
    formFields: {
      $items: { label: true, type: true, placeholder: true },
    },
  },
  Footer: {
    logo: true,
    logoImage: true,
    logoImageTitle: true,
    logoType: true,
    desc: true,
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
    footerContact: true,
    footerLegalLinks: true,
    socialLinks: true,
    footerSocialLinks: true,
    copyrightText: true,
    officeLabel: true,
    contactLabel: true,
    legalTitle: true,
    disclaimerTitle: true,
    disclaimerText: true,
    newsletterTitle: true,
    newsletterDesc: true,
    newsletterPlaceholder: true,
    newsletterButtonLabel: true,
    recentNewsTitle: true,
    recentNews: {
      $items: { title: true, date: true, image: true, href: true },
    },
    footerSubscribe: true,
    whatsappLink: true,
    callLink: true,
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
  category?: string;
  onChange: (path: GenericFieldPath, value: unknown) => void;
  onMediaChange: (
    path: GenericFieldPath,
    fieldName: string,
    file: File,
  ) => void;
  onAddArrayItem?: (path: GenericFieldPath, items: unknown[]) => void;
  onDeleteArrayItem?: (
    path: GenericFieldPath,
    index: number,
    item: unknown,
    items: unknown[],
  ) => void;
  availablePageNames?: string[];
  cardFields?: string[];
  categorySelectOptions?: Array<{ value: string; label: string }>;
};

const userManageableCollectionFields = new Set([
  "productItems",
  "productSlides",
  "testimonialItems",
  "faqItems",
  "galleryItems",
  "listings",
  "awardItems",
  "blogItems",
  "stats",
  "statistics",
  "trustBadges",
  "features",
  "whyChooseUsItems",
  "projectItems",
  "cities",
  "items",
  "steps",
  "programs",
  "values",
  "benefits",
  "culture",
  "jobs",
  "categories",
  "collectionItems",
  "impactStats",
  "groups",
  "events",
  "testimonials",
  "articles",
  "recentNews",
  "tabs",
  "images",
  "cards",
  "members",
  "milestones",
  "coreBeliefs",
  "points",
  "departments",
  "awards",
  "ctaItems",
  "content",
  "relatedPosts",
  "roles",
  "whyJoinUs",
  "contactItems",
  "highlights",
  "projectPoints",
  "sections",
  "skills",
  "stats",
  "experience",
  "achievements",
  "mediaCards",
  "buttons",
  "sectors",
  "metrics",
  "branches",
  "supportCards",
  "questions",
  "partnersList",
  "focusItems",
  "csrProjectItems",
  "pillars",
  "coreValueItems",
  "brochures",
  "ctaStats",
  "popularPosts",
  "primaryParagraphs",
  "secondaryParagraphs",
  "leftPoints",
  "leftFeatures",
  "steps",
  "breadcrumb",
  "conditions",
]);

const formatFieldLabel = (fieldName: string) =>
  fieldName === "href"
    ? "Link"
    : fieldName === "src"
      ? "Image"
      : fieldName === "fields"
        ? "Form Fields"
                : fieldName === "line1"
          ? "Title"
          : fieldName === "highlight"
            ? "Highlight"
            : fieldName === "line2"
              ? "Title Line 2"
                : fieldName === "sectionTitle"
                  ? "Title"
              : fieldName === "articleUrl"
                ? "Redirect URL"
                : fieldName === "titleLink"
                ? "Title Link"
                : fieldName === "purposeCard"
                  ? "Our Purpose"
    : fieldName === "iconName"
      ? "Icon"
    : fieldName === "titleHighlight"
      ? "Highlight"
    : fieldName === "partnerTitle"
      ? "Title"
    : fieldName === "partnerTitleHighlight"
      ? "Highlight"
    : fieldName === "partnerDesc"
      ? "Description"
    : fieldName === "partnerButton"
      ? "Button"
    : fieldName === "sectionTag"
      ? "Section Tag"
    : fieldName === "sectors"
      ? "Industries"
    : fieldName === "locationsLabel"
      ? "Pretitle"
    : fieldName === "locationsTitle"
      ? "Title"
    : fieldName === "mapImage"
      ? "Map Image"
    : fieldName === "ctaLabel"
      ? "Pretitle"
    : fieldName === "ctaTitle"
      ? "Title"
    : fieldName === "ctaDesc"
      ? "Description"
    : fieldName === "ctaPrimaryButton"
      ? "Primary Button"
    : fieldName === "ctaSecondaryButton"
      ? "Secondary Button"
    : fieldName === "ctaImage"
      ? "Image"
    : fieldName === "awardsLabel"
      ? "Pretitle"
    : fieldName === "awardsTitle"
      ? "Title"
    : fieldName === "supportLabel"
      ? "Pretitle"
    : fieldName === "supportTitle"
      ? "Title"
    : fieldName === "supportTitleHighlight"
      ? "Highlight"
    : fieldName === "supportDesc"
      ? "Description"
    : fieldName === "supportButton"
      ? "Button"
    : fieldName === "supportImage"
      ? "Image"
    : fieldName === "transparencyTitle"
      ? "Title"
    : fieldName === "transparencyDesc"
      ? "Description"
    : fieldName === "transparencyButton"
      ? "Button"
    : fieldName === "rolesTitle"
      ? "Title"
    : fieldName === "rolesApplyLabel"
      ? "Apply Button"
    : fieldName === "ctaButton"
      ? "Button"
    : fieldName === "website"
      ? "Website"
    : fieldName === "mapEmbedUrl"
      ? "Map Embed URL"
    : fieldName === "waysPretitle"
      ? "Pretitle"
    : fieldName === "waysTitle"
      ? "Title"
    : fieldName === "impactPretitle"
      ? "Pretitle"
    : fieldName === "impactTitle"
      ? "Title"
    : fieldName === "closingText"
      ? "Closing Text"
    : fieldName === "value2"
      ? "Value 2"
    : fieldName === "ctaPretitle"
      ? "Pretitle"
    : fieldName === "listPretitle"
      ? "Pretitle"
    : fieldName === "listTitle"
      ? "Title"
    : fieldName === "titleLine1"
      ? "Title Line 1"
    : fieldName === "titleLine2"
      ? "Title Line 2"
    : fieldName === "downloadlabel"
      ? "Download Label"
    : fieldName === "downloadUrl"
      ? "Download URL"
    : fieldName === "transparencyIcon"
      ? "Icon"
    : fieldName === "employmentType"
      ? "Job Type"
    : fieldName === "subLabel"
      ? "Sub Label"
    : fieldName === "city"
      ? "City"
                : fieldName === "showExploreButton"
                  ? "Show Explore Button"
                : fieldName === "newsletterDesc"
                  ? "Description"
                : fieldName === "recentNews"
                  ? "Recent Blogs"
                : fieldName === "recentNewsTitle"
                  ? "Recent Blogs Title"
              : fieldName === "desc"
            ? "Description"
              : fieldName === "leftPretitle"
                ? "Left Pretitle"
              : fieldName === "leftTitle"
                ? "Left Title"
              : fieldName === "leftTitleHighlight"
                ? "Left Title Highlight"
              : fieldName === "leftDesc"
                ? "Left Description"
              : fieldName === "formTitle"
                ? "Form Title"
              : fieldName === "formPretitle"
                ? "Form Pretitle"
              : fieldName === "leftFeatures"
                ? "Features"
              : fieldName === "contactTitle"
                ? "Pretitle"
              : fieldName === "contactPretitle"
                ? "Title"
              : fieldName === "contactDesc"
                ? "Description"
              : fieldName === "primary"
            ? "Description"
            : fieldName === "secondary"
              ? "Description 2"
              : fieldName === "videoUrl"
                ? "Video URL"
                : fieldName === "showDecorations"
                  ? "Show Decorations"
                  : fieldName
                      .replace(/([A-Z])/g, " $1")
                      .replace(/([a-zA-Z])(\d+)/g, "$1 $2")
                      .replace(/^./, (letter) => letter.toUpperCase());

const eventsAboutContentFieldLabels: Record<string, string> = {
  description1: "Description 1",
  description2: "Description 2",
  description3: "Description 3",
  quote: "Quote 1",
  quoteRole: "Quote 2",
  image: "Image 1",
  imageAlt: "Image Alt 1",
  image2: "Image 2",
  image2Alt: "Image Alt 2",
};

const nestedContentFieldOrder = [
  "image",
  "logo",
  "src",
  "video",
  "videoUrl",
  "icon",
  "line1",
  "title",
  "name",
  "pretitle",
  "subtitle",
  "highlight",
  "primary",
  "secondary",
  "desc",
  "description",
  "detail",
  "body",
  "excerpt",
  "alt",
  "year",
  "org",
  "stat",
  "step",
  "number",
  "label",
  "value",
  "text",
  "items",
  "variant",
  "price",
  "status",
  "statusText",
  "type",
  "category",
  "titleLink",
  "location",
  "date",
  "phone",
  "email",
  "href",
  "link",
];

const headingContentFieldOrder = [
  "pretitle",
  "eyebrow",
  "sectionTitle",
  "title",
  "subtitle",
  "highlightedText",
  "desc",
  "description",
  "desc2",
  "excerpt",
  "body",
];

const propertyListingContentFieldOrder = [
  "image",
  "statusText",
  "propertyType",
  "price",
  "title",
  "href",
  "location",
  "description",
  "features",
];
const careerFormFieldOrder = ["label", "placeholder"];
const careerJobContentFields = new Set([
  "title",
  "location",
  "type",
  "desc",
]);
const careerBenefitContentFields = new Set(["title", "desc"]);

const isUploadedImageValue = (value: unknown): value is string =>
  typeof value === "string" &&
  /^(data:image\/|blob:|https?:\/\/|\/)/i.test(value.trim());

const getEditableObjectEntries = (
  value: Record<string, unknown>,
): Array<[string, unknown]> => {
  const hasIcon = Object.prototype.hasOwnProperty.call(value, "icon");
  const iconValue = value.icon;

  // Only remap icon → image when the icon value is an uploaded/media URL.
  // Named icons like "IconAward" stay editable as text/select.
  if (hasIcon && !("image" in value) && isUploadedImageValue(iconValue)) {
    return [
      ["image", iconValue] as [string, unknown],
      ...(Object.entries(value).filter(
        ([field]) => field !== "icon",
      ) as Array<[string, unknown]>),
    ];
  }

  return Object.entries(value) as Array<[string, unknown]>;
};

const sortNestedContentEntries = (
  entries: Array<[string, unknown]>,
  fieldOrder = nestedContentFieldOrder,
) => entries.sort(([leftField], [rightField]) => {
  const leftIndex = fieldOrder.indexOf(leftField);
  const rightIndex = fieldOrder.indexOf(rightField);
  const leftOrder = leftIndex === -1 ? fieldOrder.length : leftIndex;
  const rightOrder = rightIndex === -1 ? fieldOrder.length : rightIndex;

  return leftOrder - rightOrder;
});

const GenericFieldEditor = ({
  fieldName,
  value,
  path,
  sectionType,
  category,
  onChange,
  onMediaChange,
  onAddArrayItem,
  onDeleteArrayItem,
  availablePageNames = [],
  cardFields,
  categorySelectOptions = [],
}: GenericFieldEditorProps) => {
  const [pendingDeleteIndex, setPendingDeleteIndex] = useState<number | null>(
    null,
  );

  if (Array.isArray(value)) {
    const isFeatureCollection =
      fieldName === "features" &&
      path.length === 3 &&
      path[0] === "listings" &&
      typeof path[1] === "number";
    const isVisionMissionPoints =
      fieldName === "points" &&
      path.length === 2 &&
      (path[0] === "vision" || path[0] === "mission");
    const isTopLevelFeaturesCollection =
      sectionType === "Features" &&
      fieldName === "features" &&
      path.length === 1;
    const isBlogCardCollection =
      (sectionType === "Blog" || sectionType === "BlogPage") &&
      (fieldName === "blogItems" || fieldName === "galleryItems") &&
      path.length === 1;
    const isPropertyProcessSteps =
      sectionType === "PropertyProcess" &&
      fieldName === "steps" &&
      path.length === 1;
    const isTabStringList =
      fieldName === "tabs" &&
      path.length === 1 &&
      (value.length === 0 ||
        value.every((item) => typeof item === "string"));
    const isContactFormFields =
      (sectionType === "Contact" ||
        sectionType === "Frenchise" ||
        sectionType === "FrenchisePage" ||
        sectionType === "Franchise" ||
        sectionType === "Enquiry" ||
        sectionType === "EnquiryPage" ||
        sectionType === "EnquiryNow") &&
      fieldName === "fields" &&
      path.length === 2 &&
      path[0] === "form";
    const isContactFeatures =
      sectionType === "Contact" &&
      fieldName === "features" &&
      path.length === 2 &&
      path[0] === "leftContent";
    const isNestedStringList =
      (path.length > 1 || isTabStringList) &&
      (value.length === 0
        ? fieldName === "content" ||
          fieldName === "items" ||
          fieldName === "text" ||
          isTabStringList
        : value.every((item) => typeof item === "string"));
    const canAddTopLevelItems =
      path.length === 1 &&
      userManageableCollectionFields.has(fieldName) &&
      Boolean(onAddArrayItem);
    const canAddItems =
      canAddTopLevelItems ||
      (isFeatureCollection && Boolean(onAddArrayItem)) ||
      (isVisionMissionPoints && Boolean(onAddArrayItem)) ||
      (isNestedStringList && Boolean(onAddArrayItem)) ||
      (isContactFormFields && Boolean(onAddArrayItem)) ||
      (isContactFeatures && Boolean(onAddArrayItem));
    const isFrenchiseFormFields =
      isContactFormFields &&
      (sectionType === "Frenchise" ||
        sectionType === "FrenchisePage" ||
        sectionType === "Franchise");
    const isEnquiryFormFields =
      isContactFormFields &&
      (sectionType === "Enquiry" ||
        sectionType === "EnquiryPage" ||
        sectionType === "EnquiryNow");
    const isEventsContactFormFields =
      isContactFormFields && category === "Events" && sectionType === "Contact";
    const isNgoContactFormFields =
      isContactFormFields &&
      category === "NGO" &&
      (sectionType === "Contact" || sectionType === "ContactPage");
    const isEnquiryLeftFeatures =
      (sectionType === "Enquiry" ||
        sectionType === "EnquiryPage" ||
        sectionType === "EnquiryNow") &&
      fieldName === "leftFeatures" &&
      path.length === 1;
    const isEnquiryContactItems =
      (sectionType === "Enquiry" ||
        sectionType === "EnquiryPage" ||
        sectionType === "EnquiryNow") &&
      fieldName === "contactItems" &&
      path.length === 1;
    const collectionLimitReached =
      (isFeatureCollection && value.length >= 5) ||
      (isTopLevelFeaturesCollection &&
        value.length >= MAX_FEATURE_CARDS) ||
      (isBlogCardCollection &&
        value.length >= MAX_BLOG_CARDS) ||
      (isPropertyProcessSteps &&
        value.length >= MAX_PROPERTY_PROCESS_STEPS) ||
      (isFrenchiseFormFields &&
        value.length >= MAX_NGO_FRENCHISE_FORM_FIELDS) ||
      (isEnquiryFormFields &&
        value.length >= MAX_NGO_ENQUIRY_FORM_FIELDS) ||
      (isEventsContactFormFields &&
        value.length >= MAX_EVENTS_CONTACT_FORM_FIELDS) ||
      (isNgoContactFormFields &&
        value.length >= MAX_NGO_CONTACT_FORM_FIELDS) ||
      (isEnquiryLeftFeatures &&
        value.length >= MAX_NGO_ENQUIRY_LEFT_FEATURES) ||
      (isEnquiryContactItems &&
        value.length >= MAX_NGO_ENQUIRY_CONTACT_ITEMS) ||
      (sectionType === "About" &&
        fieldName === "stats" &&
        path.length === 1 &&
        value.length >= 1) ||
      (category === "Events" &&
        sectionType === "About" &&
        fieldName === "buttons" &&
        path.length === 1 &&
        value.length >= 1) ||
      (category === "NGO" &&
        (sectionType === "About" ||
          sectionType === "AboutPage" ||
          sectionType === "AboutUsPage") &&
        fieldName === "buttons" &&
        path.length === 1 &&
        value.length >= 2) ||
      (category === "NGO" &&
        (sectionType === "About" ||
          sectionType === "AboutPage" ||
          sectionType === "AboutUsPage") &&
        fieldName === "trustBadges" &&
        path.length === 1 &&
        value.length >= 3) ||
      (category === "NGO" &&
        (sectionType === "About" ||
          sectionType === "AboutPage" ||
          sectionType === "AboutUsPage") &&
        fieldName === "statistics" &&
        path.length === 1 &&
        value.length >= 4) ||
      (category === "NGO" &&
        (sectionType === "AboutPage" ||
          sectionType === "AboutUsPage") &&
        fieldName === "tabs" &&
        path.length === 1 &&
        value.length >= 4) ||
      (category === "NGO" &&
        (sectionType === "AboutPage" ||
          sectionType === "AboutUsPage") &&
        fieldName === "cards" &&
        path.length === 1 &&
        value.length >= 6) ||
      (category === "NGO" &&
        sectionType === "Causes" &&
        fieldName === "items" &&
        path.length === 1 &&
        value.length >= 6) ||
      (category === "NGO" &&
        sectionType === "Footer" &&
        fieldName === "recentNews" &&
        path.length === 1 &&
        value.length >= 3);
    const canDeleteItems =
      Boolean(onDeleteArrayItem) &&
      value.length > 0 &&
      (isNestedStringList ||
        isContactFormFields ||
        isContactFeatures ||
        ((path.length === 1 || isFeatureCollection || isVisionMissionPoints) &&
          value.some(
            (item) =>
              typeof item === "object" && item !== null && !Array.isArray(item),
          )));
    const canReorderItems = isContactFormFields && value.length > 1;
    const moveItem = (fromIndex: number, toIndex: number) => {
      if (toIndex < 0 || toIndex >= value.length) return;
      const nextItems = [...value];
      const [moved] = nextItems.splice(fromIndex, 1);
      nextItems.splice(toIndex, 0, moved);
      onChange(path, nextItems);
    };
    const pendingDeleteItem =
      pendingDeleteIndex === null ? undefined : value[pendingDeleteIndex];
    const pendingDeleteRecord =
      typeof pendingDeleteItem === "object" &&
        pendingDeleteItem !== null &&
        !Array.isArray(pendingDeleteItem)
        ? (pendingDeleteItem as Record<string, unknown>)
        : undefined;
    const pendingDeleteName =
      typeof pendingDeleteItem === "string" && pendingDeleteItem.trim()
        ? pendingDeleteItem.trim()
        : [
            pendingDeleteRecord?.title,
            pendingDeleteRecord?.productTitle,
            pendingDeleteRecord?.name,
            pendingDeleteRecord?.label,
            pendingDeleteRecord?.placeholder,
            pendingDeleteRecord?.question,
          ].find((item): item is string => typeof item === "string" && Boolean(item.trim())) ??
          (pendingDeleteIndex === null ? "this card" : `Item ${pendingDeleteIndex + 1}`);
    const deleteItemNoun = isFeatureCollection
      ? "feature"
      : isContactFormFields
        ? "field"
      : isNestedStringList
        ? "item"
        : "card";

    return (
      <section className="rounded-xl bg-[#f4f4f5] p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h4 className="text-sm font-bold text-slate-900">
            {sectionType === "Causes" && fieldName === "items"
              ? `Causes (${value.length})`
              : (sectionType === "Projects" || sectionType === "ProjectsPage") &&
                  fieldName === "items"
                ? `Projects (${value.length})`
              : (sectionType === "Events" || sectionType === "EventsPage") &&
                  fieldName === "events"
                ? `Events (${value.length})`
              : (sectionType === "Testimonial" ||
                    sectionType === "TestimonialsPage") &&
                  fieldName === "testimonials"
                ? `Testimonials (${value.length})`
              : category === "NGO" &&
                  (sectionType === "Teams" || sectionType === "TeamsPage") &&
                  fieldName === "members"
                ? `Team Members (${value.length})`
              : category === "Events" &&
                  (sectionType === "Teams" || sectionType === "Team") &&
                  fieldName === "departments"
                ? `Department Tabs (${value.length})`
              : category === "Events" &&
                  (sectionType === "Teams" || sectionType === "Team") &&
                  fieldName === "members"
                ? `Team Members (${value.length})`
              : category === "NGO" &&
                  sectionType === "Media" &&
                  fieldName === "mediaCards"
                ? `Media (${value.length})`
              : category === "NGO" &&
                  sectionType === "Industry" &&
                  fieldName === "sectors"
                ? `Industries (${value.length})`
              : category === "NGO" &&
                  sectionType === "Industry" &&
                  fieldName === "metrics"
                ? `Metrics (${value.length})`
              : category === "NGO" &&
                  sectionType === "Branches" &&
                  fieldName === "stats"
                ? `Stats (${value.length})`
              : category === "NGO" &&
                  sectionType === "Branches" &&
                  fieldName === "branches"
                ? `Branches (${value.length})`
              : category === "NGO" &&
                  (sectionType === "Support" || sectionType === "SupportPage") &&
                  fieldName === "values"
                ? `Values (${value.length})`
              : category === "NGO" &&
                  (sectionType === "Support" || sectionType === "SupportPage") &&
                  fieldName === "supportCards"
                ? `Support Cards (${value.length})`
              : category === "NGO" &&
                  (sectionType === "Support" || sectionType === "SupportPage") &&
                  fieldName === "stats"
                ? `Stats (${value.length})`
              : category === "NGO" &&
                  sectionType === "Contact" &&
                  fieldName === "contactItems"
                ? `Contact Details (${value.length})`
              : category === "NGO" &&
                  (sectionType === "Frenchise" ||
                    sectionType === "FrenchisePage" ||
                    sectionType === "Franchise") &&
                  fieldName === "features"
                ? `Features (${value.length})`
              : category === "NGO" &&
                  (sectionType === "Frenchise" ||
                    sectionType === "FrenchisePage" ||
                    sectionType === "Franchise") &&
                  fieldName === "leftPoints"
                ? `Benefits (${value.length})`
              : category === "NGO" &&
                  (sectionType === "Frenchise" ||
                    sectionType === "FrenchisePage" ||
                    sectionType === "Franchise") &&
                  fieldName === "steps"
                ? `Steps (${value.length})`
              : isEnquiryLeftFeatures
                ? `Features (${value.length})`
              : isEnquiryContactItems
                ? `Contact (${value.length})`
              : category === "NGO" &&
                  sectionType === "Branches" &&
                  fieldName === "contactItems"
                ? `Contact (${value.length})`
              : category === "NGO" &&
                  sectionType === "Gallery" &&
                  fieldName === "categories"
                ? `Categories (${value.length})`
              : category === "NGO" &&
                  sectionType === "Gallery" &&
                  fieldName === "images"
                ? `Photos (${value.length})`
              : category === "NGO" &&
                  (sectionType === "FAQ" || sectionType === "FAQPage") &&
                  fieldName === "questions"
                ? `Questions (${value.length})`
              : category === "NGO" &&
                  (sectionType === "Partners" || sectionType === "PartnersPage") &&
                  fieldName === "partnersList"
                ? `Partners (${value.length})`
              : category === "NGO" &&
                  (sectionType === "CSR" || sectionType === "CSRPage") &&
                  fieldName === "stats"
                ? `Stats (${value.length})`
              : category === "NGO" &&
                  (sectionType === "CSR" || sectionType === "CSRPage") &&
                  fieldName === "focusItems"
                ? `Focus Areas (${value.length})`
              : category === "NGO" &&
                  (sectionType === "CSR" || sectionType === "CSRPage") &&
                  fieldName === "pillars"
                ? `Pillars (${value.length})`
              : category === "NGO" &&
                  (sectionType === "CSR" || sectionType === "CSRPage") &&
                  fieldName === "csrProjectItems"
                ? `CSR Projects (${value.length})`
              : category === "NGO" &&
                  (sectionType === "CSR" || sectionType === "CSRPage") &&
                  fieldName === "coreValueItems"
                ? `Core Values (${value.length})`
              : category === "NGO" &&
                  (sectionType === "Brochure" || sectionType === "BrochurePage") &&
                  fieldName === "features"
                ? `Features (${value.length})`
              : category === "NGO" &&
                  (sectionType === "Brochure" || sectionType === "BrochurePage") &&
                  fieldName === "brochures"
                ? `Brochures (${value.length})`
              : category === "NGO" &&
                  (sectionType === "Brochure" || sectionType === "BrochurePage") &&
                  fieldName === "ctaStats"
                ? `Stats (${value.length})`
              : category === "NGO" &&
                  sectionType === "CaseStudy" &&
                  fieldName === "items"
                ? `Case Studies (${value.length})`
              : category === "NGO" &&
                  (sectionType === "CaseDetails" ||
                    sectionType === "CaseDetailsPage") &&
                  fieldName === "popularPosts"
                ? `Popular Posts (${value.length})`
              : category === "NGO" &&
                  (sectionType === "CaseDetails" ||
                    sectionType === "CaseDetailsPage") &&
                  fieldName === "primaryParagraphs"
                ? `Article Paragraphs (${value.length})`
              : category === "NGO" &&
                  (sectionType === "CaseDetails" ||
                    sectionType === "CaseDetailsPage") &&
                  fieldName === "secondaryParagraphs"
                ? `Secondary Paragraphs (${value.length})`
              : sectionType === "Blog" && fieldName === "articles"
                ? `Blogs (${value.length})`
              : sectionType === "Footer" && fieldName === "recentNews"
                ? `Recent Blogs (${value.length})`
              : `${formatFieldLabel(fieldName)} (${value.length})`}
          </h4>
          {canAddItems &&
            !(
              sectionType === "About" &&
              fieldName === "stats" &&
              collectionLimitReached
            ) &&
            !(
              category === "Events" &&
              sectionType === "About" &&
              fieldName === "buttons" &&
              collectionLimitReached
            ) && (
            <button
              type="button"
              disabled={collectionLimitReached}
              onClick={() => onAddArrayItem?.(path, value)}
              className={`flex items-center gap-1 rounded-md bg-blue-600 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 ${isFeatureCollection
                ? "px-2.5 py-1.5 text-[10px]"
                : "px-3 py-2 text-xs"
                }`}
            >
              <Plus size={isFeatureCollection ? 11 : 14} />
              {collectionLimitReached
                ? isPropertyProcessSteps
                  ? `Maximum ${MAX_PROPERTY_PROCESS_STEPS} Cards`
                  : isBlogCardCollection
                    ? `Maximum ${MAX_BLOG_CARDS} Cards`
                    : isTopLevelFeaturesCollection
                      ? `Maximum ${MAX_FEATURE_CARDS} Cards`
                      : category === "NGO" &&
                          (sectionType === "AboutPage" ||
                            sectionType === "AboutUsPage") &&
                          fieldName === "tabs"
                        ? "Maximum 4 Tabs"
                      : category === "NGO" &&
                          (sectionType === "AboutPage" ||
                            sectionType === "AboutUsPage") &&
                          fieldName === "cards"
                        ? "Maximum 6 Cards"
                      : category === "NGO" &&
                          (sectionType === "About" ||
                            sectionType === "AboutPage" ||
                            sectionType === "AboutUsPage") &&
                          fieldName === "statistics"
                        ? "Maximum 4 Statistics"
                        : category === "NGO" &&
                            (sectionType === "About" ||
                              sectionType === "AboutPage" ||
                              sectionType === "AboutUsPage") &&
                            fieldName === "trustBadges"
                          ? "Maximum 3 Trust Badges"
                          : category === "NGO" &&
                              (sectionType === "About" ||
                                sectionType === "AboutPage" ||
                                sectionType === "AboutUsPage") &&
                              fieldName === "buttons"
                            ? "Maximum 2 Buttons"
                            : category === "NGO" &&
                                sectionType === "Causes" &&
                                fieldName === "items"
                              ? "Maximum 6 Causes"
                            : category === "NGO" &&
                                sectionType === "Footer" &&
                                fieldName === "recentNews"
                              ? "Maximum 3 Blogs"
                            : isFrenchiseFormFields
                              ? `Maximum ${MAX_NGO_FRENCHISE_FORM_FIELDS} Fields`
                            : isEnquiryFormFields
                              ? `Maximum ${MAX_NGO_ENQUIRY_FORM_FIELDS} Fields`
                            : isEventsContactFormFields
                              ? `Maximum ${MAX_EVENTS_CONTACT_FORM_FIELDS} Fields`
                            : isNgoContactFormFields
                              ? `Maximum ${MAX_NGO_CONTACT_FORM_FIELDS} Fields`
                            : isEnquiryLeftFeatures
                              ? `Maximum ${MAX_NGO_ENQUIRY_LEFT_FEATURES} Features`
                            : isEnquiryContactItems
                              ? `Maximum ${MAX_NGO_ENQUIRY_CONTACT_ITEMS} Contact Items`
                            : "Maximum 5 Features"
                : fieldName === "listings"
                  ? "Add Product"
                  : fieldName === "buttons"
                    ? "Add Button"
                    : fieldName === "statistics"
                      ? "Add Statistic"
                      : fieldName === "trustBadges"
                        ? "Add Trust Badge"
                    : fieldName === "items" && sectionType === "Causes"
                      ? "Add Cause"
                    : fieldName === "items" &&
                        (sectionType === "Services" ||
                          sectionType === "ServicesPage")
                      ? "Add Service"
                    : fieldName === "members" &&
                        category === "NGO" &&
                        (sectionType === "Teams" ||
                          sectionType === "TeamsPage")
                      ? "Add Member"
                    : fieldName === "mediaCards" && sectionType === "Media"
                      ? "Add Media"
                    : fieldName === "sectors" && sectionType === "Industry"
                      ? "Add Industry"
                    : fieldName === "metrics" && sectionType === "Industry"
                      ? "Add Metric"
                    : fieldName === "stats" && sectionType === "Branches"
                      ? "Add Stat"
                    : fieldName === "branches" && sectionType === "Branches"
                      ? "Add Branch"
                    : fieldName === "contactItems" &&
                        category === "NGO" &&
                        sectionType === "Contact"
                      ? "Add Detail"
                    : fieldName === "features" &&
                        category === "NGO" &&
                        (sectionType === "Frenchise" ||
                          sectionType === "FrenchisePage" ||
                          sectionType === "Franchise")
                      ? "Add Feature"
                    : fieldName === "leftPoints" &&
                        category === "NGO" &&
                        (sectionType === "Frenchise" ||
                          sectionType === "FrenchisePage" ||
                          sectionType === "Franchise")
                      ? "Add Benefit"
                    : fieldName === "steps" &&
                        category === "NGO" &&
                        (sectionType === "Frenchise" ||
                          sectionType === "FrenchisePage" ||
                          sectionType === "Franchise")
                      ? "Add Step"
                    : isEnquiryLeftFeatures
                      ? "Add Feature"
                    : isEnquiryContactItems
                      ? "Add Contact"
                    : fieldName === "contactItems" &&
                        sectionType === "Branches"
                      ? "Add Contact"
                    : fieldName === "stats" && sectionType === "AwardsPage"
                      ? "Add Stat"
                    : fieldName === "awards" && sectionType === "AwardsPage"
                      ? "Add Award"
                    : fieldName === "benefits" && sectionType === "Careers"
                      ? "Add Benefit"
                    : fieldName === "jobs" && sectionType === "Careers"
                      ? "Add Job"
                    : fieldName === "items" &&
                        (sectionType === "Projects" ||
                          sectionType === "ProjectsPage")
                      ? "Add Project"
                    : fieldName === "events" &&
                        (sectionType === "Events" ||
                          sectionType === "EventsPage")
                      ? "Add Event"
                    : fieldName === "testimonials" &&
                        (sectionType === "Testimonial" ||
                          sectionType === "TestimonialsPage")
                      ? "Add Testimonial"
                    : fieldName === "brochures" &&
                        category === "NGO" &&
                        (sectionType === "Brochure" ||
                          sectionType === "BrochurePage")
                      ? "Add Brochure"
                    : fieldName === "ctaStats" &&
                        category === "NGO" &&
                        (sectionType === "Brochure" ||
                          sectionType === "BrochurePage")
                      ? "Add Stat"
                    : fieldName === "items" &&
                        category === "NGO" &&
                        sectionType === "CaseStudy"
                      ? "Add Case Study"
                    : fieldName === "popularPosts" &&
                        category === "NGO" &&
                        (sectionType === "CaseDetails" ||
                          sectionType === "CaseDetailsPage")
                      ? "Add Popular Post"
                    : fieldName === "primaryParagraphs" &&
                        category === "NGO" &&
                        (sectionType === "CaseDetails" ||
                          sectionType === "CaseDetailsPage")
                      ? "Add Paragraph"
                    : fieldName === "secondaryParagraphs" &&
                        category === "NGO" &&
                        (sectionType === "CaseDetails" ||
                          sectionType === "CaseDetailsPage")
                      ? "Add Paragraph"
                    : fieldName === "categories" &&
                        category === "NGO" &&
                        sectionType === "Gallery"
                      ? "Add Category"
                    : fieldName === "images" &&
                        category === "NGO" &&
                        sectionType === "Gallery"
                      ? "Add Photo"
                    : fieldName === "cards" &&
                        category === "NGO" &&
                        sectionType === "Contact"
                      ? "Add Feature"
                    : fieldName === "articles" && sectionType === "Blog"
                      ? "Add Blog"
                    : fieldName === "recentNews" && sectionType === "Footer"
                      ? "Add Blog"
                    : isContactFormFields
                      ? "Add Field"
                  : isFeatureCollection
                    ? "Add Feature"
                    : isNestedStringList
                      ? isTabStringList
                        ? "Add Tab"
                        : "Add Item"
                      : "Add New"}
            </button>
          )}
        </div>
        {value.length ? (
          <div className="space-y-3">
            {value.map((item, index) => {
  const record =
    item &&
    typeof item === "object" &&
    !Array.isArray(item)
      ? (item as Record<string, unknown>)
      : null;

  // Keys must not come from editable text, otherwise each keystroke remounts
  // the item block and the focused input loses the caret.
  const itemKey = record?.id ?? `${fieldName}-${index}`;

  return (
    <div
      key={String(itemKey)}
      className="rounded-xl border border-slate-200 bg-white p-3"
    >
      {isTabStringList || isNestedStringList ? (
        <div className="flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <GenericFieldEditor
              fieldName={
                isTabStringList
                  ? `Tab heading Item ${index + 1}`
                  : `Item ${index + 1}`
              }
              value={item}
              path={[...path, index]}
              sectionType={sectionType}
              category={category}
              onChange={onChange}
              onMediaChange={onMediaChange}
              onAddArrayItem={onAddArrayItem}
              onDeleteArrayItem={onDeleteArrayItem}
              availablePageNames={availablePageNames}
              cardFields={cardFields}
              categorySelectOptions={categorySelectOptions}
            />
          </div>
          {canDeleteItems && (
            <button
              type="button"
              onClick={() => setPendingDeleteIndex(index)}
              className="mb-0 flex h-10 shrink-0 items-center gap-1 rounded-lg border border-red-200 bg-white px-3 text-xs font-semibold text-red-600 hover:bg-red-50"
              aria-label={`Delete ${formatFieldLabel(fieldName)} item ${index + 1}`}
            >
              <Trash size={15} />
              Delete
            </button>
          )}
        </div>
      ) : (
        <div className="relative">
          <div className="mb-2 flex items-center justify-end gap-2">
            {canReorderItems && (
              <>
                <button
                  type="button"
                  onClick={() => moveItem(index, index - 1)}
                  disabled={index === 0}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label={`Move field ${index + 1} up`}
                >
                  <ChevronUp size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => moveItem(index, index + 1)}
                  disabled={index === value.length - 1}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label={`Move field ${index + 1} down`}
                >
                  <ChevronDown size={16} />
                </button>
                <span className="mr-1 text-xs font-semibold text-slate-500">
                  {index + 1}
                  {index === 0 ? "st" : index === 1 ? "nd" : index === 2 ? "rd" : "th"}
                </span>
              </>
            )}
            {canDeleteItems && (
              <button
                type="button"
                onClick={() => setPendingDeleteIndex(index)}
                className={`flex items-center gap-1 rounded-lg border border-red-200 bg-white font-semibold text-red-600 hover:bg-red-50 ${
                  isFeatureCollection
                    ? "h-7 px-2 text-[10px]"
                    : "h-8 px-3 text-xs"
                }`}
                aria-label={`Delete ${formatFieldLabel(fieldName)} item ${index + 1}`}
              >
                <Trash size={isFeatureCollection ? 11 : 15} />
                Delete
              </button>
            )}
          </div>

          <GenericFieldEditor
            fieldName={
              isContactFormFields
                ? `Field ${index + 1}`
                : isContactFeatures
                  ? `Card ${index + 1}`
                  : category === "NGO" &&
                      (sectionType === "AboutPage" ||
                        sectionType === "AboutUsPage") &&
                      path[0] === "tabs"
                    ? `Tab ${index + 1}`
                    : category === "NGO" &&
                        (sectionType === "AboutPage" ||
                          sectionType === "AboutUsPage") &&
                        path.includes("features")
                      ? `Feature ${index + 1}`
                      : `Item ${index + 1}`
            }
            value={item}
            path={[...path, index]}
            sectionType={sectionType}
            category={category}
            onChange={onChange}
            onMediaChange={onMediaChange}
            onAddArrayItem={onAddArrayItem}
            onDeleteArrayItem={onDeleteArrayItem}
            availablePageNames={availablePageNames}
            cardFields={cardFields}
            categorySelectOptions={categorySelectOptions}
          />
        </div>
      )}
    </div>
  );
})}
          </div>
        ) : (
          <p className="text-xs text-slate-500">No items to edit.</p>
        )}
        {pendingDeleteIndex !== null &&
          createPortal(
            <div className="fixed inset-0 z-[10020] flex items-center justify-center bg-slate-950/45 px-4">
              <div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="delete-card-title"
                className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-2xl"
              >
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-600">
                  <Trash size={20} />
                </div>
                <h3
                  id="delete-card-title"
                  className="mt-4 text-xl font-semibold text-slate-950"
                >
                  Delete this {deleteItemNoun}?
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  “{pendingDeleteName}” will be removed from this section.
                </p>
                <div className="mt-6 flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setPendingDeleteIndex(null)}
                    className="rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onDeleteArrayItem?.(
                        path,
                        pendingDeleteIndex,
                        value[pendingDeleteIndex],
                        value,
                      );
                      setPendingDeleteIndex(null);
                    }}
                    className="rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )}
      </section>
    );
  }

  if (typeof value === "object" && value !== null) {
    const titleRecord = value as Record<string, unknown>;
    const isNgoWhyChooseTitle =
      category === "NGO" &&
      (sectionType === "AboutPage" || sectionType === "AboutUsPage") &&
      fieldName === "title" &&
      path.length === 1 &&
      typeof titleRecord.line1 === "string" &&
      !("highlight" in titleRecord);
    if (isNgoWhyChooseTitle) {
      const titleText = [titleRecord.line1, titleRecord.line2]
        .filter((part): part is string => typeof part === "string" && Boolean(part.trim()))
        .join(" ")
        .trim();
      return (
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-slate-600">
            Title
          </span>
          <input
            value={titleText}
            onChange={(event) => onChange(path, event.target.value)}
            className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-blue-600"
          />
        </label>
      );
    }

    const isNgoMissionImageSection =
      category === "NGO" &&
      (sectionType === "AboutPage" || sectionType === "AboutUsPage") &&
      fieldName === "imageSection";
    const isNgoMissionPurposeCard =
      category === "NGO" &&
      (sectionType === "AboutPage" || sectionType === "AboutUsPage") &&
      fieldName === "purposeCard";
    const purposeCardValue = isNgoMissionImageSection
      ? (value as Record<string, unknown>).purposeCard
      : undefined;
    const hasPurposeCard =
      purposeCardValue !== null &&
      typeof purposeCardValue === "object" &&
      !Array.isArray(purposeCardValue);

    return (
      <div className="space-y-3">
        {fieldName.startsWith("Item ") && (
          <h5 className="text-xs font-bold uppercase tracking-wide text-slate-500">
            {fieldName}
          </h5>
        )}
        {isNgoMissionPurposeCard && (
          <div className="flex items-center justify-between gap-3">
            <h5 className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Our Purpose
            </h5>
            <button
              type="button"
              onClick={() => onChange(path, null)}
              className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
            >
              <Trash size={13} />
              Delete
            </button>
          </div>
        )}
        {(() => {
          const isPropertyListingItem =
            path.length === 2 &&
            path[0] === "listings" &&
            isPropertyCatalogSection(sectionType);
          const isCareerFormItem =
            path.length === 2 &&
            path[0] === "formFields" &&
            sectionType === "CareerPage";
          const editableEntries = getEditableObjectEntries(
            value as Record<string, unknown>,
          );
          // Card whitelists describe a collection item, so they must only be
          // applied to the item itself, never to objects nested inside it.
          const isCollectionItem =
            typeof path[path.length - 1] === "number" &&
            (path.length === 2 || path.length === 3);
          const collectionKey = isCollectionItem
            ? typeof path[path.length - 2] === "string"
              ? (path[path.length - 2] as string)
              : undefined
            : undefined;
          const collectionCardFields = isCollectionItem
            ? category === "NGO" &&
              sectionType === "Gallery" &&
              collectionKey === "categories"
              ? ["label"]
              : category === "NGO" &&
                  sectionType === "Gallery" &&
                  (collectionKey === "images" ||
                    collectionKey === "galleryItems" ||
                    collectionKey === "cards")
                ? ["image", "src", "category"]
              : collectionKey === "partnersList"
                ? ["logo", "name", "website"]
              : collectionKey === "focusItems"
                ? ["image", "icon", "title", "description"]
              : collectionKey === "csrProjectItems"
                ? ["image", "title", "description"]
              : collectionKey === "pillars" || collectionKey === "coreValueItems"
                ? ["icon", "title", "description"]
              : collectionKey === "brochures"
                ? ["image", "name", "description", "downloadlabel", "downloadUrl"]
              : collectionKey === "ctaStats"
                ? ["icon", "value", "label"]
              : collectionKey === "questions"
                ? ["question", "answer"]
              : category === "NGO" &&
                  (sectionType === "Support" || sectionType === "SupportPage") &&
                  collectionKey === "values"
                ? ["icon", "title", "description"]
              : category === "NGO" &&
                  (sectionType === "Support" || sectionType === "SupportPage") &&
                  collectionKey === "supportCards"
                ? ["icon", "title", "description", "button"]
              : category === "NGO" &&
                  (sectionType === "Support" || sectionType === "SupportPage") &&
                  collectionKey === "stats"
                ? ["icon", "value", "label"]
              : category === "NGO" &&
                  sectionType === "Contact" &&
                  collectionKey === "contactItems"
                ? ["icon", "title", "value"]
              : category === "NGO" &&
                  sectionType === "Contact" &&
                  collectionKey === "fields"
                ? ["label", "placeholder", "type", "width"]
              : category === "Events" &&
                  sectionType === "Careers" &&
                  collectionKey === "stats"
                ? ["value", "label"]
              : category === "Events" &&
                  sectionType === "Careers" &&
                  collectionKey === "roles"
                ? ["title", "location", "type", "description"]
              : category === "Events" &&
                  sectionType === "CareersApply" &&
                  collectionKey === "whyJoinUs"
                ? ["icon", "title", "description"]
              : category === "NGO" &&
                  sectionType === "About" &&
                  collectionKey === "buttons"
                ? ["label", "href", "variant", "icon"]
              : category === "NGO" &&
                  sectionType === "About" &&
                  collectionKey === "trustBadges"
                ? ["icon", "text", "desc"]
              : category === "NGO" &&
                  sectionType === "About" &&
                  collectionKey === "statistics"
                ? ["icon", "value", "label"]
              : category === "NGO" &&
                  (sectionType === "AboutPage" ||
                    sectionType === "AboutUsPage") &&
                  collectionKey === "tabs"
                ? visibleCardFieldsByCollection.ngoMissionTabItems
              : category === "NGO" &&
                  (sectionType === "AboutPage" ||
                    sectionType === "AboutUsPage") &&
                  collectionKey === "features"
                ? visibleCardFieldsByCollection.ngoMissionFeatures
              : category === "Events" &&
                  (sectionType === "Teams" || sectionType === "Team") &&
                  collectionKey === "departments"
                ? ["label", "value"]
              : category === "Events" &&
                  (sectionType === "Teams" || sectionType === "Team") &&
                  collectionKey === "members"
                ? ["image", "name", "role", "department", "bio", "social"]
              : collectionKey === "breadcrumb"
              ? visibleCardFieldsByCollection.breadcrumb
              : collectionKey === "buttons"
                ? visibleCardFieldsByCollection.buttons
                : collectionKey === "fields"
                  ? visibleCardFieldsByCollection.fields
                  : cardFields?.length
                    ? cardFields
                    : collectionKey
                      ? visibleCardFieldsByCollection[collectionKey]
                      : undefined
            : undefined;
          const isNgoMissionFeatureItem =
            category === "NGO" &&
            (sectionType === "AboutPage" || sectionType === "AboutUsPage") &&
            path.includes("features") &&
            typeof path[path.length - 1] === "number";
          const objectFieldAllowlist =
            category === "Events" &&
            sectionType === "Contact" &&
            fieldName === "form"
              ? ["fields", "buttonLabel", "buttonIcon"]
              : category === "NGO" &&
            sectionType === "Contact" &&
            fieldName === "office"
              ? ["title", "description", "address", "phone", "email", "hours"]
              : category === "NGO" &&
                  sectionType === "Contact" &&
                  fieldName === "form"
                ? ["title", "pretitle", "fields", "button"]
              : category === "NGO" &&
                  sectionType === "Contact" &&
                  (fieldName === "address" ||
                    fieldName === "phone" ||
                    fieldName === "email" ||
                    fieldName === "hours")
                ? ["label", "value"]
              : category === "NGO" &&
                  sectionType === "Contact" &&
                  fieldName === "button"
                ? ["label"]
              : isNgoMissionFeatureItem
                ? visibleCardFieldsByCollection.ngoMissionFeatures
              : category === "NGO" &&
                  (sectionType === "AboutPage" ||
                    sectionType === "AboutUsPage") &&
                  fieldName === "content" &&
                  path[0] === "tabs"
                ? ["primary", "secondary", "features"]
              : category === "Events" &&
                  (sectionType === "AboutPage" ||
                    sectionType === "AboutUsPage") &&
                  (fieldName === "cta" ||
                    (path.length === 1 && path[0] === "cta"))
                ? ["pretitle", "title", "description", "button"]
              : visibleObjectFieldsByKey[fieldName] ??
            (path.length === 1 && typeof path[0] === "string"
              ? visibleObjectFieldsByKey[path[0]]
              : undefined);
          const entries = sortNestedContentEntries(
            objectFieldAllowlist?.length
              ? editableEntries.filter(([field]) =>
                objectFieldAllowlist.includes(field),
              )
              : collectionCardFields?.length
                ? editableEntries.filter(([field]) =>
                  collectionCardFields.includes(field),
                )
                : editableEntries,
            isPropertyListingItem
              ? propertyListingContentFieldOrder
              : isCareerFormItem
                ? careerFormFieldOrder
                : objectFieldAllowlist?.length
                  ? objectFieldAllowlist
                  : collectionCardFields?.length
                    ? collectionCardFields
                    : nestedContentFieldOrder,
          );
          if (collectionCardFields?.length) {
            for (const field of collectionCardFields) {
              if (entries.some(([key]) => key === field)) continue;
              if (
                field === "image" &&
                (entries.some(([key]) => key === "src") ||
                  editableEntries.some(([key]) => key === "src"))
              ) {
                continue;
              }
              if (
                field === "src" &&
                (entries.some(([key]) => key === "image") ||
                  editableEntries.some(([key]) => key === "image"))
              ) {
                continue;
              }
              entries.push([field, ""]);
            }
          }
          const isProductItem =
            path.length === 2 &&
            (path[0] === "productItems" || path[0] === "productSlides");

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

          const visibleEntries = entries.filter(([childName, childValue]) => {
            if (isNgoMissionImageSection && childName === "purposeCard") {
              return (
                childValue !== null &&
                typeof childValue === "object" &&
                !Array.isArray(childValue)
              );
            }
            return true;
          });

          return (
            <>
              {visibleEntries.map(([childName, childValue]) => (
                <GenericFieldEditor
                  key={childName}
                  fieldName={childName}
                  value={childValue}
                  path={[...path, childName]}
                  sectionType={sectionType}
                  category={category}
                  onChange={onChange}
                  onMediaChange={onMediaChange}
                  onAddArrayItem={onAddArrayItem}
                  onDeleteArrayItem={onDeleteArrayItem}
                  availablePageNames={availablePageNames}
                  cardFields={cardFields}
                  categorySelectOptions={categorySelectOptions}
                />
              ))}
              {isNgoMissionImageSection && !hasPurposeCard ? (
                <button
                  type="button"
                  onClick={() =>
                    onChange([...path, "purposeCard"], {
                      icon: "target",
                      badge: "Our Purpose",
                      title: "Creating meaningful impact for a better tomorrow.",
                    })
                  }
                  className="flex items-center gap-1 rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  <Plus size={14} />
                  Add Our Purpose
                </button>
              ) : null}
            </>
          );
        })()}
      </div>
    );
  }

  const label =
    path[0] === "tabs" &&
    typeof path[1] === "number" &&
    path.length === 2
      ? `Tab ${Number(path[1]) + 1}`
      : sectionType === "Contact" &&
          path[0] === "leftContent" &&
          fieldName === "title" &&
          path.length === 2
        ? "Card Title"
        : (sectionType === "Projects" || sectionType === "ProjectsPage") &&
            fieldName === "href"
          ? "Redirect URL"
        : category === "NGO" &&
            sectionType === "Gallery" &&
            fieldName === "label" &&
            path[0] === "categories"
          ? "Category Name"
        : category === "NGO" &&
            sectionType === "Contact" &&
            path[0] === "contactItems" &&
            fieldName === "title"
          ? "Title"
        : category === "NGO" &&
            sectionType === "Contact" &&
            fieldName === "pretitle"
          ? "Description"
        : sectionType === "Contact" &&
            path[0] === "leftContent" &&
            fieldName === "description" &&
            path.length === 2
          ? "Card Description"
          : (sectionType === "AboutPage" || sectionType === "AboutUsPage") &&
              path.length === 1 &&
              eventsAboutContentFieldLabels[fieldName]
            ? eventsAboutContentFieldLabels[fieldName]
            : formatFieldLabel(fieldName);
  const mediaKind =
    typeof value === "string" ? getMediaKindFromKey(fieldName) : null;

  if (mediaKind) {
    const stringValue = value as string;
    const hasMedia = Boolean(stringValue.trim());

    return (
      <div>
        <span className="mb-1 block text-xs font-semibold text-slate-600">
          {label}
        </span>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem] sm:items-start">
          <div className="space-y-2">
            <label className="flex h-10 w-full cursor-pointer items-center justify-between rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 transition hover:border-blue-500 focus-within:border-blue-600">
              <span className="font-medium">
                {hasMedia ? `Change ${mediaKind}` : `Upload ${mediaKind}`}
              </span>
              <span className="max-w-[55%] truncate text-xs text-slate-500">
                {getMediaUploadLabel(stringValue, mediaKind)}
              </span>
              <input
                type="file"
                accept={mediaKind === "video" ? "video/*" : "image/*"}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) onMediaChange(path, fieldName, file);
                  event.target.value = "";
                }}
                className="sr-only"
              />
            </label>
            {hasMedia && fieldName === "backgroundImage" && (
              <button
                type="button"
                onClick={() => onChange(path, "")}
                className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
              >
                <Trash size={13} />
                Remove {mediaKind}
              </button>
            )}
          </div>
          <div className="relative">
            <MediaUploadPreview src={stringValue} type={mediaKind} />
          </div>
        </div>
      </div>
    );
  }

  if (typeof value === "boolean") {
    return (
      <label className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 bg-white px-3 py-2">
        <span className="text-xs font-semibold text-slate-600">{label}</span>
        <input
          type="checkbox"
          checked={value}
          onChange={(event) => onChange(path, event.target.checked)}
          className="h-4 w-4 accent-blue-600"
        />
      </label>
    );
  }

  const stringValue = value == null ? "" : String(value);
  if (/color$/i.test(fieldName) && fieldName !== "bgColor") {
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
  const isRating =
    (sectionType === "Testimonial" || sectionType === "TestimonialsPage") &&
    fieldName === "rating";
  const isNumber = typeof value === "number" || isRating;
  const isLongText =
    stringValue.length > 80 ||
    /^(desc|desc2|description|message|answer|quote|copyrightText|primary|secondary)$/i.test(
      fieldName,
    );
  const isProductLink =
    fieldName === "link" &&
    path.length === 3 &&
    (path[0] === "productItems" || path[0] === "productSlides");
  const isIconField =
    fieldName === "icon" ||
    fieldName === "buttonIcon" ||
    fieldName === "iconName" ||
    fieldName === "transparencyIcon";
  const isSocialIconField =
    isIconField &&
    path.some(
      (segment) =>
        segment === "socials" ||
        segment === "socialLinks" ||
        segment === "social",
    );
  const pageExists = availablePageNames.some(
    (pageName) =>
      pageName.trim().toLowerCase() === stringValue.trim().toLowerCase(),
  );
  const useNgoIcons = category === "NGO";
  const activeIconOptions = isSocialIconField
    ? ngoSocialIconOptions
    : useNgoIcons
      ? ngoIconOptions
      : iconFieldOptions;
  const iconSelectValue = activeIconOptions.some(
    (option) => option.value === stringValue,
  )
    ? stringValue
    : "";

  if (fieldName === "variant") {
    return (
      <label className="block">
        <span className="mb-1 block text-xs font-semibold text-slate-600">
          Variant
        </span>
        <select
          value={stringValue || "primary"}
          onChange={(event) => onChange(path, event.target.value)}
          className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-blue-600"
        >
          <option value="primary">Primary</option>
          <option value="secondary">Secondary</option>
        </select>
      </label>
    );
  }

  if (
    fieldName === "category" &&
    category === "NGO" &&
    sectionType === "Gallery" &&
    categorySelectOptions.length > 0
  ) {
    const optionValues = categorySelectOptions.map((option) => option.value);
    const selectValue = optionValues.includes(stringValue)
      ? stringValue
      : "";

    return (
      <label className="block">
        <span className="mb-1 block text-xs font-semibold text-slate-600">
          Category
        </span>
        <select
          value={selectValue}
          onChange={(event) => onChange(path, event.target.value)}
          className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-blue-600"
        >
          <option value="" disabled>
            Select category
          </option>
          {categorySelectOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (
    fieldName === "badge" &&
    category === "Events" &&
    sectionType === "Gallery" &&
    categorySelectOptions.length > 0
  ) {
    const matchedOption =
      categorySelectOptions.find(
        (option) =>
          option.value.toLowerCase() === stringValue.toLowerCase(),
      ) ?? null;

    return (
      <label className="block">
        <span className="mb-1 block text-xs font-semibold text-slate-600">
          Category
        </span>
        <select
          value={matchedOption?.value ?? ""}
          onChange={(event) => onChange(path, event.target.value)}
          className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-blue-600"
        >
          <option value="" disabled>
            Select category
          </option>
          {categorySelectOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (
    fieldName === "department" &&
    category === "Events" &&
    (sectionType === "Teams" || sectionType === "Team") &&
    categorySelectOptions.length > 0
  ) {
    const matchedOption =
      categorySelectOptions.find(
        (option) =>
          option.value.toLowerCase() === stringValue.toLowerCase(),
      ) ?? null;

    return (
      <label className="block">
        <span className="mb-1 block text-xs font-semibold text-slate-600">
          Department
        </span>
        <select
          value={matchedOption?.value ?? ""}
          onChange={(event) => onChange(path, event.target.value)}
          className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-blue-600"
        >
          <option value="" disabled>
            Select department
          </option>
          {categorySelectOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (isIconField) {
    return (
      <label className="block">
        <span className="mb-1 block text-xs font-semibold text-slate-600">
          {label}
        </span>
        <select
          value={iconSelectValue}
          onChange={(event) => onChange(path, event.target.value)}
          className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-blue-600"
        >
          <option value="" disabled>
            Select icon
          </option>
          {activeIconOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (
    fieldName === "type" &&
    path[0] === "form" &&
    path[1] === "fields" &&
    typeof path[2] === "number"
  ) {
    return (
      <label className="block">
        <span className="mb-1 block text-xs font-semibold text-slate-600">
          Field Type
        </span>
        <select
          value={stringValue || "text"}
          onChange={(event) => onChange(path, event.target.value)}
          className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-blue-600"
        >
          <option value="text">Text</option>
          <option value="email">Email</option>
          <option value="tel">Phone</option>
          <option value="textarea">Textarea</option>
          <option value="select">Select</option>
          <option value="radio">Radio</option>
        </select>
      </label>
    );
  }

  if (
    fieldName === "width" &&
    path[0] === "form" &&
    path[1] === "fields" &&
    typeof path[2] === "number"
  ) {
    return (
      <label className="block">
        <span className="mb-1 block text-xs font-semibold text-slate-600">
          Field Width
        </span>
        <select
          value={stringValue === "full" ? "full" : "half"}
          onChange={(event) => onChange(path, event.target.value)}
          className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-blue-600"
        >
          <option value="half">Half</option>
          <option value="full">Full</option>
        </select>
      </label>
    );
  }

  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-slate-600">
        {label}
      </span>
      {isLongText ? (
        <textarea
          value={stringValue}
          onChange={(event) => onChange(path, event.target.value)}
          className="h-24 w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
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
          className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-blue-600"
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
    className={`rounded-md border px-3 py-1 text-xs font-semibold ${hidden
      ? "border-emerald-300 text-emerald-700 hover:bg-emerald-50"
      : "border-slate-300 text-slate-600 hover:bg-slate-50"
      }`}
  >
    {hidden ? "Show" : "Hide"}
  </button>
);

export default function EditSectionModal({
  category,
  sectionId,
  sectionType,
  subsectionScope,
  sections,
  onClose,
  onSave,
  onSelectVariant,
  onUpdateSectionData,
  onDeleteSection,
}: EditSectionModalProps) {
  const scopedContentTab = subsectionScope
    ? category === "Events"
      ? getSubsectionContentTabName(subsectionScope.label)
      : `${subsectionScope.label} Content`
    : null;
  const scopedFields = subsectionScope?.fields ?? [];
  const scopedFormFields = subsectionScope?.formTabFields?.filter((field) =>
    scopedFields.includes(field),
  ) ?? [];
  const hasScopedContentAndFormTabs =
    Boolean(subsectionScope) &&
    scopedFormFields.length > 0 &&
    scopedFields.some((field) => !scopedFormFields.includes(field));
  const [activeTab, setActiveTab] = useState(
    subsectionScope?.label.trim().toLowerCase() === "project categories"
      ? "Tabs"
      : hasScopedContentAndFormTabs
        ? scopedContentTab ?? getDefaultTab(sectionType)
        : subsectionScope
          ? category === "Events"
            ? getSubsectionContentTabName(subsectionScope.label)
            : `${subsectionScope.label} Content`
          : getDefaultTab(sectionType),
  );
  const [colorPanelOpen, setColorPanelOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [galleryLayoutStart, setGalleryLayoutStart] = useState(0);
  const [hasChanges, setHasChanges] = useState(false);
  const [lastChangedSection, setLastChangedSection] = useState(sectionType);
  const { currentPage, pageLinks, setCurrentPage, setPageLinks, activePortfolioFilter } = usePreview();
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
  const [boxLayoutMessage, setBoxLayoutMessage] = useState("");
  const [pendingCareersFormFieldDeleteIndex, setPendingCareersFormFieldDeleteIndex] =
    useState<number | null>(null);
  const [pendingFooterSectionDelete, setPendingFooterSectionDelete] = useState<{
    kind: "logo" | "column" | "contact" | "disclaimer" | "bottom";
    label: string;
    index?: number;
  } | null>(null);
  const [pendingBannerSlideDelete, setPendingBannerSlideDelete] = useState<{
    index: number;
    label: string;
  } | null>(null);
  const [pendingNGOInstagramImageDelete, setPendingNGOInstagramImageDelete] =
    useState<{
      index: number;
      label: string;
    } | null>(null);
  const [pendingNGOPopupSocialLinkDelete, setPendingNGOPopupSocialLinkDelete] =
    useState<{
      index: number;
      label: string;
    } | null>(null);
  const bannerImageInputRef = useRef<HTMLInputElement>(null);
  const bannerVideoInputRef = useRef<HTMLInputElement>(null);
  const breadcrumbImageInputRef = useRef<HTMLInputElement>(null);
  const activeSectionType = normalizeSectionType(sectionType);
  const currentSection = sections.find(
    (item) => (item.id ?? item.type) === sectionId,
  );
  const activeSectionKey = currentSection?.id ?? currentSection?.type ?? sectionId;
  const isPageSection = Boolean(currentSection?.page);
  const isEventsHomeContact =
    category === "Events" &&
    activeSectionType === "Contact" &&
    !isPageSection;
  const activeVariant = currentSection?.data?.[currentSection.variant]
    ? currentSection.variant
    : currentSection?.variant?.startsWith(`${activeSectionType}-`)
      ? currentSection.variant
      : `${activeSectionType}-1`;
  const fallbackVariantData =
    currentSection?.data?.[`${activeSectionType}-1`] ??
    Object.values(currentSection?.data ?? {})[0];
  const currentVariantData = currentSection?.data?.[activeVariant];
  const layoutVariantData = currentVariantData
    ? {
      ...(innerPageContentDefaultsByVariant[activeVariant] ?? {}),
      ...currentVariantData,
    }
    : currentVariantData;
  const layoutCardCollections = layoutVariantData
    ? Object.entries(layoutVariantData).filter(([field, value]) => {
      if (!Array.isArray(value) || !value.length) {
        return false;
      }

      if (subsectionScope) {
        const scopedCardFields = subsectionScope.fields?.filter((fieldName) =>
          cardCollectionFields.has(fieldName),
        );
        if (!subsectionScope.hasCardLayout && !scopedCardFields?.length) {
          return false;
        }

        if (subsectionScope.fields?.length) {
          if (!subsectionScope.fields.includes(field)) return false;
        } else {
          const scopedContent = normalizeScopeContent(subsectionScope.content);
          if (!valueAppearsInSubsection(value, scopedContent)) return false;
        }
      } else if (!cardCollectionFields.has(field)) {
        return false;
      }

      if (field === "categories" && activeSectionType !== "Highlight") {
        return false;
      }

      if (activeSectionType === "PropertyDetail" && field === "features") {
        return false;
      }

      return true;
    })
    : [];
  const hasCardCollection = layoutCardCollections.length > 0;
  const boxLayoutCollectionField =
    layoutCardCollections.length === 1
      ? String(layoutCardCollections[0][0])
      : undefined;
  const isEventsCareersSection =
    category === "Events" && activeSectionType === "Careers";
  const isEventsCareersOpenRolesSubsection =
    isEventsCareersSection &&
    subsectionScope?.label.trim().toLowerCase() === "open roles";
  const isEventsTeamsSection =
    category === "Events" && activeSectionType === "Teams";
  const isEventsTeamMembersSubsection =
    isEventsTeamsSection &&
    subsectionScope?.label.trim().toLowerCase() === "team members";
  const showEventsTeamTabsTab = isEventsTeamMembersSubsection;
  const showBoxLayoutTab =
    hasCardCollection &&
    (!isPageSection || Boolean(subsectionScope) || Boolean(boxLayoutCollectionField)) &&
    !(
      category === "Events" &&
      isPageSection &&
      !isEventsCareersOpenRolesSubsection
    ) &&
    !(category === "Events" && activeSectionType === "Contact") &&
    !(category === "Events" && activeSectionType === "About") &&
    !(
      category === "NGO" &&
      (activeSectionType === "Testimonial" ||
        activeSectionType === "TestimonialsPage")
    ) &&
    !(category === "NGO" && activeSectionType === "TeamDetail") &&
    !(category === "NGO" && activeSectionType === "Media") &&
    !(
      category === "NGO" &&
      activeSectionType === "Industry" &&
      subsectionScope?.label.trim().toLowerCase() === "industry partner"
    ) &&
    !(
      category === "NGO" &&
      activeSectionType === "Branches" &&
      ["branches", "branches content", "branches cta", "branches contact"].includes(
        subsectionScope?.label.trim().toLowerCase() ?? "",
      )
    ) &&
    !(
      category === "NGO" &&
      activeSectionType === "AwardsPage" &&
      [
        "awards",
        "awards content",
        "awards support",
        "awards transparency",
      ].includes(subsectionScope?.label.trim().toLowerCase() ?? "")
    ) &&
    !(
      category === "NGO" &&
      activeSectionType === "Careers" &&
      ["open roles", "careers cta"].includes(
        subsectionScope?.label.trim().toLowerCase() ?? "",
      )
    ) &&
    !(category === "NGO" && activeSectionType === "Gallery") &&
    !(
      category === "NGO" &&
      (activeSectionType === "Contact" || activeSectionType === "ContactPage")
    ) &&
    !(
      category === "NGO" &&
      (activeSectionType === "Support" || activeSectionType === "SupportPage")
    ) &&
    !(
      category === "NGO" &&
      (activeSectionType === "FAQ" || activeSectionType === "FAQPage")
    ) &&
    !(
      category === "NGO" &&
      (activeSectionType === "Partners" || activeSectionType === "PartnersPage")
    ) &&
    !(
      category === "NGO" &&
      (activeSectionType === "CSR" || activeSectionType === "CSRPage")
    ) &&
    !(
      category === "NGO" &&
      (activeSectionType === "Brochure" || activeSectionType === "BrochurePage")
    ) &&
    !(category === "NGO" && activeSectionType === "CaseStudy") &&
    !(
      category === "NGO" &&
      (activeSectionType === "CaseDetails" ||
        activeSectionType === "CaseDetailsPage")
    ) &&
    !(
      category === "NGO" &&
      (activeSectionType === "Frenchise" ||
        activeSectionType === "FrenchisePage" ||
        activeSectionType === "Franchise")
    ) &&
    !(
      category === "NGO" &&
      (activeSectionType === "Enquiry" ||
        activeSectionType === "EnquiryPage" ||
        activeSectionType === "EnquiryNow")
    ) &&
    !(
      category === "NGO" &&
      (activeSectionType === "RefundPolicy" ||
        activeSectionType === "Refund" ||
        activeSectionType === "PrivacyPolicy" ||
        activeSectionType === "TermsCondition" ||
        activeSectionType === "TermsConditions" ||
        activeSectionType === "CookiePolicy" ||
        activeSectionType === "Disclaimer")
    ) &&
    !(category === "NGO" && activeSectionType === "TestimonialsPage");
  const availableCardCount = hasCardCollection
    ? Math.min(...layoutCardCollections.map(([, value]) => (value as unknown[]).length))
    : 0;
  const baseSidebarItems = sidebarItemsBySection[activeSectionType] ?? [
    `${activeSectionType} Content`,
  ];
  const sidebarItems =
    category === "NGO" && activeSectionType === "Testimonial"
      ? ["Testimonial Content", "Testimonial Layout"]
      : isEventsHomeContact
        ? ["Contact Content", "Form", "Contact Layout"]
      : category === "Events" &&
          isPageSection &&
          !subsectionScope &&
          !eventsInnerPagesWithoutPageLayout.has(activeSectionType)
        ? [`${activeSectionType} Content`, `${activeSectionType} Layout`]
        : category === "Events" &&
            activeSectionType === "Contact" &&
            isPageSection
          ? baseSidebarItems.filter((item) => item !== "Contact Layout")
          : baseSidebarItems;
  const editableTabsItem =
    activeSectionType === "CitiesWeServe" ||
    activeSectionType === "PopularEvents" ||
    activeVariant === "RealEstateProject1"
      ? ["Tabs"]
      : [];
  const isEventsInnerPageSubsection =
    category === "Events" && isPageSection && Boolean(subsectionScope);
  const isNGOProjectsSection =
    category === "NGO" &&
    /projects/i.test(activeSectionType) &&
    !/detail/i.test(activeSectionType);
  const isNGOIndustrySection =
    category === "NGO" && activeSectionType === "Industry";
  const isNGOBranchesSection =
    category === "NGO" && activeSectionType === "Branches";
  const isNGOAwardsSection =
    category === "NGO" && activeSectionType === "AwardsPage";
  const isNGOCareersSection =
    category === "NGO" && activeSectionType === "Careers";
  const isNGOBlogSection =
    category === "NGO" &&
    (activeSectionType === "Blog" || activeSectionType === "BlogPage");
  const isNGOEventsSection =
    category === "NGO" &&
    (activeSectionType === "Events" || activeSectionType === "EventsPage");
  const isNGOGallerySection =
    category === "NGO" &&
    (activeSectionType === "Gallery" || activeSectionType === "GalleryPage");
  const isNGOContactSection =
    category === "NGO" &&
    (activeSectionType === "Contact" || activeSectionType === "ContactPage");
  const isNGOSupportSection =
    category === "NGO" &&
    (activeSectionType === "Support" || activeSectionType === "SupportPage");
  const isNGOFAQSection =
    category === "NGO" &&
    (activeSectionType === "FAQ" || activeSectionType === "FAQPage");
  const isNGOPartnersSection =
    category === "NGO" &&
    (activeSectionType === "Partners" || activeSectionType === "PartnersPage");
  const isNGOCsrSection =
    category === "NGO" &&
    (activeSectionType === "CSR" || activeSectionType === "CSRPage");
  const isNGOBrochureSection =
    category === "NGO" &&
    (activeSectionType === "Brochure" || activeSectionType === "BrochurePage");
  const isNGOCaseStudySection =
    category === "NGO" && activeSectionType === "CaseStudy";
  const isNGOCaseDetailsSection =
    category === "NGO" &&
    (activeSectionType === "CaseDetails" ||
      activeSectionType === "CaseDetailsPage");
  const isNGOFrenchiseSection =
    category === "NGO" &&
    (activeSectionType === "Frenchise" ||
      activeSectionType === "FrenchisePage" ||
      activeSectionType === "Franchise");
  const isNGOEnquirySection =
    category === "NGO" &&
    (activeSectionType === "Enquiry" ||
      activeSectionType === "EnquiryPage" ||
      activeSectionType === "EnquiryNow");
  const isNGORefundSection =
    category === "NGO" &&
    (activeSectionType === "RefundPolicy" ||
      activeSectionType === "Refund");
  const isNGOLegalPagesSection =
    category === "NGO" &&
    (isNGORefundSection ||
      activeSectionType === "PrivacyPolicy" ||
      activeSectionType === "TermsCondition" ||
      activeSectionType === "TermsConditions" ||
      activeSectionType === "CookiePolicy" ||
      activeSectionType === "Disclaimer");
  const isNGOTestimonialsPageSection =
    category === "NGO" && activeSectionType === "TestimonialsPage";
  const isNGOCareersOpenRolesSubsection =
    isNGOCareersSection &&
    subsectionScope?.label.trim().toLowerCase() === "open roles";
  const isNGOAboutPageSubsection =
    category === "NGO" &&
    Boolean(subsectionScope) &&
    (isNGOProjectsSection ||
      isNGOIndustrySection ||
      isNGOBranchesSection ||
      isNGOAwardsSection ||
      isNGOCareersSection ||
      isNGOBlogSection ||
      isNGOEventsSection ||
      isNGOGallerySection ||
      isNGOContactSection ||
      isNGOSupportSection ||
      isNGOFAQSection ||
      isNGOPartnersSection ||
      isNGOCsrSection ||
      isNGOBrochureSection ||
      isNGOCaseStudySection ||
      isNGOCaseDetailsSection ||
      isNGOFrenchiseSection ||
      isNGOEnquirySection ||
      isNGOLegalPagesSection ||
      isNGOTestimonialsPageSection ||
      (isPageSection &&
        (activeSectionType === "AboutPage" ||
          activeSectionType === "AboutUsPage" ||
          activeSectionType === "Services" ||
          activeSectionType === "ServicesPage" ||
          activeSectionType === "Teams" ||
          activeSectionType === "TeamsPage" ||
          activeSectionType === "TeamDetail" ||
          activeSectionType === "Media" ||
          activeSectionType === "Industry" ||
          activeSectionType === "ProjectsPage" ||
          activeSectionType === "Blog" ||
          activeSectionType === "BlogPage" ||
          activeSectionType === "EventsPage" ||
          activeSectionType === "Gallery" ||
          activeSectionType === "GalleryPage" ||
          activeSectionType === "Contact" ||
          activeSectionType === "ContactPage" ||
          activeSectionType === "Support" ||
          activeSectionType === "SupportPage" ||
          activeSectionType === "FAQ" ||
          activeSectionType === "FAQPage" ||
          activeSectionType === "Partners" ||
          activeSectionType === "PartnersPage" ||
          activeSectionType === "CSR" ||
          activeSectionType === "CSRPage" ||
          activeSectionType === "Brochure" ||
          activeSectionType === "BrochurePage" ||
          activeSectionType === "CaseStudy" ||
          activeSectionType === "CaseDetails" ||
          activeSectionType === "CaseDetailsPage" ||
          activeSectionType === "Frenchise" ||
          activeSectionType === "FrenchisePage" ||
          activeSectionType === "Franchise" ||
          activeSectionType === "Enquiry" ||
          activeSectionType === "EnquiryPage" ||
          activeSectionType === "EnquiryNow" ||
          activeSectionType === "RefundPolicy" ||
          activeSectionType === "Refund" ||
          activeSectionType === "PrivacyPolicy" ||
          activeSectionType === "TermsCondition" ||
          activeSectionType === "TermsConditions" ||
          activeSectionType === "CookiePolicy" ||
          activeSectionType === "Disclaimer" ||
          activeSectionType === "TestimonialsPage")));
  const showEventsCareersFormTab =
    isEventsCareersOpenRolesSubsection || isNGOCareersOpenRolesSubsection;
  const subsectionSidebarLabel = subsectionScope?.label.trim() ?? "";
  const subsectionContentTabName =
    getSubsectionContentTabName(subsectionSidebarLabel);
  const subsectionLayoutTabName =
    getSubsectionLayoutTabName(subsectionSidebarLabel);
  const visibleSidebarItems = subsectionScope
    ? hasScopedContentAndFormTabs
      ? [
          scopedContentTab ?? `${activeSectionType} Content`,
          "Form",
          ...(isNGOFrenchiseSection || isNGOEnquirySection
            ? [subsectionLayoutTabName]
            : []),
        ]
      : [
        activeVariant === "RealEstateProject1" &&
          subsectionScope.label.trim().toLowerCase() === "project categories"
          ? "Tabs"
          : subsectionContentTabName,
        ...(isEventsInnerPageSubsection || isNGOAboutPageSubsection
          ? [subsectionLayoutTabName]
          : []),
        ...(showEventsCareersFormTab &&
        (isEventsCareersOpenRolesSubsection || isNGOCareersOpenRolesSubsection)
          ? [EVENTS_CAREERS_FORM_TAB]
          : []),
        ...(showEventsTeamTabsTab ? ["Tabs"] : []),
        ...(showBoxLayoutTab ? ["Box Layout"] : []),
      ]
    : showBoxLayoutTab
      ? [
          ...sidebarItems,
          ...(showEventsCareersFormTab ? [EVENTS_CAREERS_FORM_TAB] : []),
          ...editableTabsItem,
          "Box Layout",
        ]
      : [
          ...sidebarItems,
          ...(showEventsCareersFormTab ? [EVENTS_CAREERS_FORM_TAB] : []),
          ...editableTabsItem,
        ];

  const sidebarTabKey = visibleSidebarItems.join("|");
  useEffect(() => {
    if (
      category === "Events" &&
      visibleSidebarItems.length > 0 &&
      !visibleSidebarItems.includes(activeTab)
    ) {
      setActiveTab(visibleSidebarItems[0]);
    }
  }, [activeTab, category, sidebarTabKey, visibleSidebarItems]);

  const activeTopbarData = currentSection?.data?.[activeVariant] as
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
      address?: string;
      phoneHref?: string;
      headerCta?: { label?: string; href?: string };
      buttons?: { label?: string; href?: string }[];
      socialLinks?: {
        label: SocialLinkData["label"];
        href: string;
      }[];
      hiddenContentFields?: string[];
    }
    | undefined;

  const activeHeaderData = currentSection?.data?.[activeVariant] as
    | {
      logo?: string;
      logoImage?: string;
      logoImageTitle?: string;
      logoType?: "image" | "text" | "image-text";
      headerBackgroundType?: HeaderBackgroundType;
      headerType?: StickySectionType;
      headerBackgroundColor?: string;
      headerGradientColor?: string;
      headerTextColor?: string;
      headerCta?: ButtonData;
      menu?: MenuItem[];
      buttons?: ButtonData[];
      button?: ButtonData;
      PopupData?: {
        aboutpopup?: { title?: string; desc?: string };
        instagram?: {
          title?: string;
          images?: Array<{ src?: string; alt?: string }>;
        };
        contactpopup?: {
          phone?: string;
          phoneHref?: string;
          separator?: string;
          email?: string;
          emailHref?: string;
        };
        socialLinkspopup?: Array<{ label?: string; href?: string }>;
      };
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

  const activeFormDetailData = currentSection?.data?.[activeVariant] as
    | {
      pretitle?: string;
      title?: string;
      desc?: string;
      formSubmitLabel?: string;
      formFields?: FormFieldData[];
    }
    | undefined;
  const pageVariantData = currentSection?.data?.[activeVariant] as
    | SectionData
    | undefined;
  const ngoAboutNestedKey = (() => {
    if (category !== "NGO") return null;
    if (
      activeSectionType !== "AboutPage" &&
      activeSectionType !== "AboutUsPage"
    ) {
      return null;
    }
    const label = subsectionScope?.label.trim().toLowerCase() ?? "";
    if (label === "mission" || label === "mission vision") return "mission";
    if (label === "why choose us") return "whyChooseUs";
    if (label === "about content") return "aboutContent";
    return null;
  })();
  const nestedNgoAboutData =
    ngoAboutNestedKey &&
    pageVariantData?.[ngoAboutNestedKey] &&
    typeof pageVariantData[ngoAboutNestedKey] === "object" &&
    !Array.isArray(pageVariantData[ngoAboutNestedKey])
      ? (pageVariantData[ngoAboutNestedKey] as SectionData)
      : undefined;
  const activeGenericData = (nestedNgoAboutData ?? pageVariantData) as
    | SectionData
    | undefined;
  const boxLayoutByField =
    activeGenericData?.boxLayoutByField &&
    typeof activeGenericData.boxLayoutByField === "object" &&
    !Array.isArray(activeGenericData.boxLayoutByField)
      ? (activeGenericData.boxLayoutByField as Record<string, unknown>)
      : {};
  const configuredBoxLayout =
    subsectionScope && boxLayoutCollectionField
      ? boxLayoutByField[boxLayoutCollectionField]
      : activeGenericData?.boxesPerRow ??
        (boxLayoutCollectionField
          ? boxLayoutByField[boxLayoutCollectionField]
          : undefined);
  const activeGenericEditorData = (() => {
    if (!activeGenericData) {
      return subsectionScope?.fieldValues as SectionData | undefined;
    }
    const editorData = {
      ...(subsectionScope?.fieldValues ?? {}),
      ...(innerPageContentDefaultsByVariant[activeVariant] ?? {}),
      ...activeGenericData,
    } as SectionData;
    const breadcrumbScopeLabel =
      subsectionScope?.label.trim().toLowerCase() ?? "";
    if (
      breadcrumbScopeLabel === "breadcrumb" ||
      breadcrumbScopeLabel === "page banner" ||
      Array.isArray(editorData.breadcrumb)
    ) {
      editorData.breadcrumbBackgroundType =
        editorData.breadcrumbBackgroundType === "color" ? "color" : "image";
      editorData.textColor = editorData.textColor || "#ffffff";
      if (editorData.breadcrumbBackgroundType === "color") {
        editorData.backgroundColor =
          editorData.backgroundColor ||
          (category === "NGO" ? "#120a1a" : "#111827");
        editorData.breadcrumbColorBackgroundType =
          editorData.breadcrumbColorBackgroundType === "gradient"
            ? "gradient"
            : "solid";
        editorData.breadcrumbGradientColor =
          editorData.breadcrumbGradientColor ||
          (category === "NGO" ? "#ff541b" : "#d61b58");
      }
      if (
        category === "NGO" &&
        !editorData.backgroundImage &&
        editorData.banner &&
        typeof editorData.banner === "object" &&
        !Array.isArray(editorData.banner)
      ) {
        const bannerImage = (editorData.banner as { bgImageUrl?: unknown })
          .bgImageUrl;
        if (typeof bannerImage === "string" && bannerImage.trim()) {
          editorData.backgroundImage = bannerImage;
        }
      }
    }

    if (isEventsHomeContact) {
      const asRecord = (value: unknown): Record<string, unknown> =>
        value && typeof value === "object" && !Array.isArray(value)
          ? (value as Record<string, unknown>)
          : {};
      const left = asRecord(editorData.leftContent);
      const cta = asRecord(left.cta);
      editorData.leftBadge =
        (typeof editorData.leftBadge === "string" && editorData.leftBadge) ||
        (typeof left.badge === "string" && left.badge) ||
        "";
      {
        const rawTitle =
          (typeof editorData.leftTitle === "string" && editorData.leftTitle) ||
          (typeof left.title === "string" && left.title) ||
          "";
        const titleLines = rawTitle.split("\n");
        editorData.leftTitle = titleLines[0] ?? "";
        editorData.leftTitleHighlight =
          (typeof editorData.leftTitleHighlight === "string" &&
            editorData.leftTitleHighlight) ||
          titleLines.slice(1).join("\n");
      }
      editorData.leftDesc =
        (typeof editorData.leftDesc === "string" && editorData.leftDesc) ||
        (typeof left.description === "string" && left.description) ||
        "";
      if (!Array.isArray(editorData.features)) {
        editorData.features = Array.isArray(left.features) ? left.features : [];
      }
      editorData.ctaLabel =
        (typeof editorData.ctaLabel === "string" && editorData.ctaLabel) ||
        (typeof cta.label === "string" && cta.label) ||
        "";
      editorData.ctaHref =
        (typeof editorData.ctaHref === "string" && editorData.ctaHref) ||
        (typeof cta.href === "string" && cta.href) ||
        "";
    }

    if (
      category === "NGO" &&
      (activeSectionType === "Services" ||
        activeSectionType === "ServicesPage") &&
      ["services", "services content", ""].includes(
        subsectionScope?.label.trim().toLowerCase() ?? "",
      )
    ) {
      const header =
        editorData.header &&
        typeof editorData.header === "object" &&
        !Array.isArray(editorData.header)
          ? (editorData.header as Record<string, unknown>)
          : {};
      const breadcrumbCurrent =
        editorData.banner &&
        typeof editorData.banner === "object" &&
        !Array.isArray(editorData.banner) &&
        typeof (editorData.banner as { breadcrumbCurrent?: unknown })
          .breadcrumbCurrent === "string"
          ? (editorData.banner as { breadcrumbCurrent: string })
              .breadcrumbCurrent
          : "";
      const headerTitle = [
        typeof header.titlePrefix === "string" ? header.titlePrefix : "",
        typeof header.titleHighlight === "string" ? header.titleHighlight : "",
      ]
        .join("")
        .trim();
      const currentTitle =
        typeof editorData.title === "string" ? editorData.title.trim() : "";
      editorData.pretitle =
        (typeof editorData.pretitle === "string" && editorData.pretitle) ||
        (typeof header.subTag === "string" && header.subTag) ||
        "TOGETHER WE SERVE";
      editorData.title =
        currentTitle &&
        currentTitle !== "Services" &&
        currentTitle !== breadcrumbCurrent
          ? currentTitle
          : headerTitle || currentTitle || "Our Services";
      editorData.desc =
        (typeof editorData.desc === "string" && editorData.desc) ||
        (typeof editorData.description === "string" &&
          editorData.description) ||
        (typeof header.description === "string" && header.description) ||
        "";
    }

    if (
      category === "NGO" &&
      (activeSectionType === "Teams" ||
        activeSectionType === "TeamsPage") &&
      ["team", "team members", ""].includes(
        subsectionScope?.label.trim().toLowerCase() ?? "",
      )
    ) {
      const badge =
        editorData.badge &&
        typeof editorData.badge === "object" &&
        !Array.isArray(editorData.badge)
          ? (editorData.badge as Record<string, unknown>)
          : {};
      const heading =
        editorData.heading &&
        typeof editorData.heading === "object" &&
        !Array.isArray(editorData.heading)
          ? (editorData.heading as Record<string, unknown>)
          : {};
      const breadcrumbCurrent =
        editorData.banner &&
        typeof editorData.banner === "object" &&
        !Array.isArray(editorData.banner) &&
        typeof (editorData.banner as { breadcrumbCurrent?: unknown })
          .breadcrumbCurrent === "string"
          ? (editorData.banner as { breadcrumbCurrent: string })
              .breadcrumbCurrent
          : "";
      const headingTitle =
        typeof heading.title === "string" ? heading.title.trim() : "";
      const currentTitle =
        typeof editorData.title === "string" ? editorData.title.trim() : "";
      const pretitleValue =
        (typeof editorData.pretitle === "string" && editorData.pretitle.trim()) ||
        (typeof badge.label === "string" && badge.label.trim()) ||
        "Meet Our Team";
      editorData.pretitle = pretitleValue;
      const sameAsPretitle = (value: string) =>
        value.trim().toLowerCase() === pretitleValue.toLowerCase();
      editorData.title =
        currentTitle &&
        currentTitle !== "Teams" &&
        !sameAsPretitle(currentTitle)
          ? currentTitle
          : headingTitle && !sameAsPretitle(headingTitle)
            ? headingTitle
            : breadcrumbCurrent && !sameAsPretitle(breadcrumbCurrent)
              ? breadcrumbCurrent
              : "Our Team";
      editorData.desc =
        (typeof editorData.desc === "string" && editorData.desc) ||
        (typeof editorData.description === "string" &&
          editorData.description) ||
        "";
    }

    if (
      category === "NGO" &&
      activeSectionType === "Media" &&
      ["media", "media content", ""].includes(
        subsectionScope?.label.trim().toLowerCase() ?? "",
      )
    ) {
      const nestedContent =
        editorData.content &&
        typeof editorData.content === "object" &&
        !Array.isArray(editorData.content)
          ? (editorData.content as Record<string, unknown>)
          : {};
      const nestedTitle =
        typeof nestedContent.sectionTitle === "string"
          ? nestedContent.sectionTitle.trim()
          : "";
      editorData.sectionTitle =
        (typeof editorData.sectionTitle === "string" &&
          editorData.sectionTitle.trim()) ||
        nestedTitle ||
        "Latest Media Highlights";
      const sourceCards = Array.isArray(editorData.mediaCards)
        ? editorData.mediaCards
        : Array.isArray(nestedContent.mediaCards)
          ? nestedContent.mediaCards
          : [];
      editorData.mediaCards = sourceCards.map((card) => {
        if (!card || typeof card !== "object" || Array.isArray(card)) {
          return card;
        }
        const item = card as Record<string, unknown>;
        return {
          ...item,
          image:
            (typeof item.image === "string" && item.image) ||
            (typeof item.logoUrl === "string" && item.logoUrl) ||
            "",
          articleUrl:
            (typeof item.articleUrl === "string" && item.articleUrl) ||
            (typeof item.href === "string" && item.href) ||
            (typeof item.link === "string" && item.link) ||
            "",
        };
      });
    }

    if (category === "NGO" && activeSectionType === "Industry") {
      const industryLabel =
        subsectionScope?.label.trim().toLowerCase() ?? "";
      const header =
        editorData.header &&
        typeof editorData.header === "object" &&
        !Array.isArray(editorData.header)
          ? (editorData.header as Record<string, unknown>)
          : {};
      const headerTitle =
        header.title &&
        typeof header.title === "object" &&
        !Array.isArray(header.title)
          ? (header.title as Record<string, unknown>)
          : {};
      const partnerBanner =
        editorData.partnerBanner &&
        typeof editorData.partnerBanner === "object" &&
        !Array.isArray(editorData.partnerBanner)
          ? (editorData.partnerBanner as Record<string, unknown>)
          : {};
      const partnerTitle =
        partnerBanner.title &&
        typeof partnerBanner.title === "object" &&
        !Array.isArray(partnerBanner.title)
          ? (partnerBanner.title as Record<string, unknown>)
          : {};
      const partnerCta =
        partnerBanner.cta &&
        typeof partnerBanner.cta === "object" &&
        !Array.isArray(partnerBanner.cta)
          ? (partnerBanner.cta as Record<string, unknown>)
          : {};

      if (
        ["", "industry", "industry content"].includes(industryLabel)
      ) {
        editorData.pretitle =
          (typeof editorData.pretitle === "string" && editorData.pretitle) ||
          (typeof header.topBadge === "string" && header.topBadge) ||
          "TOGETHER WE EMPOWER";
        const currentTitle =
          typeof editorData.title === "string" ? editorData.title.trim() : "";
        const highlightTitle = [
          typeof editorData.titleHighlight === "string"
            ? editorData.titleHighlight
            : "",
          typeof headerTitle.part2 === "string" ? headerTitle.part2 : "",
        ]
          .map((part) => part.trim())
          .find(Boolean) ?? "";
        const combinedTitle = [
          typeof headerTitle.part1 === "string" ? headerTitle.part1 : "",
          typeof headerTitle.part2 === "string" ? headerTitle.part2 : "",
        ]
          .map((part) => part.trim())
          .filter(Boolean)
          .join(" ");
        const mergedTitle =
          currentTitle &&
          highlightTitle &&
          !currentTitle.toLowerCase().includes(highlightTitle.toLowerCase())
            ? `${currentTitle} ${highlightTitle}`.trim()
            : currentTitle;
        editorData.title =
          mergedTitle && mergedTitle.toLowerCase() !== "industry we serve"
            ? mergedTitle
            : combinedTitle || "Industries We Serve";
        editorData.desc =
          (typeof editorData.desc === "string" && editorData.desc) ||
          (typeof header.pretitle === "string" && header.pretitle) ||
          "";
        editorData.sectionTag =
          (typeof editorData.sectionTag === "string" &&
            editorData.sectionTag) ||
          (typeof header.sectionTag === "string" && header.sectionTag) ||
          "";
        const sourceSectors = Array.isArray(editorData.sectors)
          ? editorData.sectors
          : Array.isArray(editorData.industries)
            ? editorData.industries
            : [];
        editorData.sectors = sourceSectors.map((card) => {
          if (!card || typeof card !== "object" || Array.isArray(card)) {
            return card;
          }
          const item = card as Record<string, unknown>;
          const imageValue = item.image;
          const imageSrc =
            typeof imageValue === "string"
              ? imageValue
              : imageValue &&
                  typeof imageValue === "object" &&
                  !Array.isArray(imageValue) &&
                  typeof (imageValue as { src?: unknown }).src === "string"
                ? (imageValue as { src: string }).src
                : "";
          const icon =
            (typeof item.icon === "string" && item.icon) ||
            (typeof item.iconName === "string" && item.iconName) ||
            "heart";
          return {
            ...item,
            image: imageSrc,
            icon,
            iconName: icon,
          };
        });
      }

      if (industryLabel === "industry partner") {
        editorData.partnerTitle =
          (typeof editorData.partnerTitle === "string" &&
            editorData.partnerTitle) ||
          (typeof partnerTitle.line1 === "string" && partnerTitle.line1) ||
          "Partner With Us to";
        editorData.partnerTitleHighlight =
          (typeof editorData.partnerTitleHighlight === "string" &&
            editorData.partnerTitleHighlight) ||
          (typeof partnerTitle.line2 === "string" && partnerTitle.line2) ||
          "Create Lasting Change";
        editorData.partnerDesc =
          (typeof editorData.partnerDesc === "string" &&
            editorData.partnerDesc) ||
          (typeof partnerBanner.description === "string" &&
            partnerBanner.description) ||
          "";
        const existingButton =
          editorData.partnerButton &&
          typeof editorData.partnerButton === "object" &&
          !Array.isArray(editorData.partnerButton)
            ? (editorData.partnerButton as Record<string, unknown>)
            : {};
        editorData.partnerButton = {
          label:
            (typeof existingButton.label === "string" &&
              existingButton.label) ||
            (typeof partnerCta.text === "string" && partnerCta.text) ||
            "Get Involved",
          href:
            (typeof existingButton.href === "string" && existingButton.href) ||
            (typeof partnerCta.url === "string" && partnerCta.url) ||
            "/contact-us",
        };
        const sourceMetrics = Array.isArray(editorData.metrics)
          ? editorData.metrics
          : Array.isArray(partnerBanner.metrics)
            ? partnerBanner.metrics
            : [];
        editorData.metrics = sourceMetrics.map((card) => {
          if (!card || typeof card !== "object" || Array.isArray(card)) {
            return card;
          }
          const item = card as Record<string, unknown>;
          return {
            ...item,
            icon:
              (typeof item.icon === "string" && item.icon) ||
              (typeof item.iconName === "string" && item.iconName) ||
              "heart",
          };
        });
      }
    }

    if (category === "NGO" && activeSectionType === "Branches") {
      const branchesLabel =
        subsectionScope?.label.trim().toLowerCase() ?? "";
      const header =
        editorData.header &&
        typeof editorData.header === "object" &&
        !Array.isArray(editorData.header)
          ? (editorData.header as Record<string, unknown>)
          : {};
      const locationsSection =
        editorData.locationsSection &&
        typeof editorData.locationsSection === "object" &&
        !Array.isArray(editorData.locationsSection)
          ? (editorData.locationsSection as Record<string, unknown>)
          : {};
      const mapSide =
        locationsSection.mapSide &&
        typeof locationsSection.mapSide === "object" &&
        !Array.isArray(locationsSection.mapSide)
          ? (locationsSection.mapSide as Record<string, unknown>)
          : {};
      const ctaBanner =
        editorData.ctaBanner &&
        typeof editorData.ctaBanner === "object" &&
        !Array.isArray(editorData.ctaBanner)
          ? (editorData.ctaBanner as Record<string, unknown>)
          : {};
      const ctaImageObj =
        ctaBanner.image &&
        typeof ctaBanner.image === "object" &&
        !Array.isArray(ctaBanner.image)
          ? (ctaBanner.image as Record<string, unknown>)
          : {};
      const primaryButton =
        ctaBanner.primaryButton &&
        typeof ctaBanner.primaryButton === "object" &&
        !Array.isArray(ctaBanner.primaryButton)
          ? (ctaBanner.primaryButton as Record<string, unknown>)
          : {};
      const secondaryButton =
        ctaBanner.secondaryButton &&
        typeof ctaBanner.secondaryButton === "object" &&
        !Array.isArray(ctaBanner.secondaryButton)
          ? (ctaBanner.secondaryButton as Record<string, unknown>)
          : {};
      const contactBar =
        editorData.contactBar &&
        typeof editorData.contactBar === "object" &&
        !Array.isArray(editorData.contactBar)
          ? (editorData.contactBar as Record<string, unknown>)
          : {};

      if (["", "branches", "branches content"].includes(branchesLabel)) {
        const currentTitle =
          typeof editorData.title === "string" ? editorData.title.trim() : "";
        editorData.pretitle =
          (typeof editorData.pretitle === "string" && editorData.pretitle) ||
          (typeof header.label === "string" && header.label) ||
          "OUR BRANCHES";
        editorData.title =
          currentTitle && currentTitle.toLowerCase() !== "branches"
            ? currentTitle
            : (typeof header.heading === "string" && header.heading) ||
              "Our Branches, Stronger Together";
        editorData.desc =
          (typeof editorData.desc === "string" && editorData.desc) ||
          (typeof header.description === "string" && header.description) ||
          "";
      }

      if (branchesLabel === "branch locations") {
        editorData.locationsLabel =
          (typeof editorData.locationsLabel === "string" &&
            editorData.locationsLabel) ||
          (typeof locationsSection.label === "string" &&
            locationsSection.label) ||
          "WHERE WE WORK";
        editorData.locationsTitle =
          (typeof editorData.locationsTitle === "string" &&
            editorData.locationsTitle) ||
          (typeof locationsSection.title === "string" &&
            locationsSection.title) ||
          "Find a Branch Near You";
        editorData.mapImage =
          (typeof editorData.mapImage === "string" && editorData.mapImage) ||
          (typeof mapSide.mapImage === "string" && mapSide.mapImage) ||
          "/Indianmap.png";
        editorData.branches = Array.isArray(editorData.branches)
          ? editorData.branches
          : Array.isArray(locationsSection.branches)
            ? locationsSection.branches
            : [];
      }

      if (branchesLabel === "branches cta") {
        editorData.ctaLabel =
          (typeof editorData.ctaLabel === "string" && editorData.ctaLabel) ||
          (typeof ctaBanner.label === "string" && ctaBanner.label) ||
          "";
        editorData.ctaTitle =
          (typeof editorData.ctaTitle === "string" && editorData.ctaTitle) ||
          (typeof ctaBanner.title === "string" && ctaBanner.title) ||
          "";
        editorData.ctaDesc =
          (typeof editorData.ctaDesc === "string" && editorData.ctaDesc) ||
          (typeof ctaBanner.description === "string" &&
            ctaBanner.description) ||
          "";
        editorData.ctaImage =
          (typeof editorData.ctaImage === "string" && editorData.ctaImage) ||
          (typeof ctaImageObj.src === "string" && ctaImageObj.src) ||
          "";
        const existingPrimary =
          editorData.ctaPrimaryButton &&
          typeof editorData.ctaPrimaryButton === "object" &&
          !Array.isArray(editorData.ctaPrimaryButton)
            ? (editorData.ctaPrimaryButton as Record<string, unknown>)
            : {};
        const existingSecondary =
          editorData.ctaSecondaryButton &&
          typeof editorData.ctaSecondaryButton === "object" &&
          !Array.isArray(editorData.ctaSecondaryButton)
            ? (editorData.ctaSecondaryButton as Record<string, unknown>)
            : {};
        editorData.ctaPrimaryButton = {
          label:
            (typeof existingPrimary.label === "string" &&
              existingPrimary.label) ||
            (typeof primaryButton.label === "string" && primaryButton.label) ||
            "Donate Now",
          href:
            (typeof existingPrimary.href === "string" &&
              existingPrimary.href) ||
            (typeof primaryButton.href === "string" && primaryButton.href) ||
            "/donate",
        };
        editorData.ctaSecondaryButton = {
          label:
            (typeof existingSecondary.label === "string" &&
              existingSecondary.label) ||
            (typeof secondaryButton.label === "string" &&
              secondaryButton.label) ||
            "Contact Us",
          href:
            (typeof existingSecondary.href === "string" &&
              existingSecondary.href) ||
            (typeof secondaryButton.href === "string" &&
              secondaryButton.href) ||
            "/contact-us",
        };
      }

      if (branchesLabel === "branches contact") {
        editorData.contactItems = Array.isArray(editorData.contactItems)
          ? editorData.contactItems
          : Array.isArray(contactBar.items)
            ? contactBar.items
            : [];
      }
    }

    if (category === "NGO" && activeSectionType === "AwardsPage") {
      const awardsLabel =
        subsectionScope?.label.trim().toLowerCase() ?? "";
      const header =
        editorData.header &&
        typeof editorData.header === "object" &&
        !Array.isArray(editorData.header)
          ? (editorData.header as Record<string, unknown>)
          : {};
      const headerTitle =
        header.title &&
        typeof header.title === "object" &&
        !Array.isArray(header.title)
          ? (header.title as Record<string, unknown>)
          : {};
      const awardsSection =
        editorData.awardsSection &&
        typeof editorData.awardsSection === "object" &&
        !Array.isArray(editorData.awardsSection)
          ? (editorData.awardsSection as Record<string, unknown>)
          : {};
      const supportBanner =
        editorData.supportBanner &&
        typeof editorData.supportBanner === "object" &&
        !Array.isArray(editorData.supportBanner)
          ? (editorData.supportBanner as Record<string, unknown>)
          : {};
      const supportTitle =
        supportBanner.title &&
        typeof supportBanner.title === "object" &&
        !Array.isArray(supportBanner.title)
          ? (supportBanner.title as Record<string, unknown>)
          : {};
      const supportCta =
        supportBanner.cta &&
        typeof supportBanner.cta === "object" &&
        !Array.isArray(supportBanner.cta)
          ? (supportBanner.cta as Record<string, unknown>)
          : {};
      const trophyImage =
        supportBanner.trophyImage &&
        typeof supportBanner.trophyImage === "object" &&
        !Array.isArray(supportBanner.trophyImage)
          ? (supportBanner.trophyImage as Record<string, unknown>)
          : {};
      const transparencyBanner =
        editorData.transparencyBanner &&
        typeof editorData.transparencyBanner === "object" &&
        !Array.isArray(editorData.transparencyBanner)
          ? (editorData.transparencyBanner as Record<string, unknown>)
          : {};
      const transparencyCta =
        transparencyBanner.cta &&
        typeof transparencyBanner.cta === "object" &&
        !Array.isArray(transparencyBanner.cta)
          ? (transparencyBanner.cta as Record<string, unknown>)
          : {};

      if (["", "awards", "awards content"].includes(awardsLabel)) {
        const currentTitle =
          typeof editorData.title === "string" ? editorData.title.trim() : "";
        editorData.pretitle =
          (typeof editorData.pretitle === "string" && editorData.pretitle) ||
          (typeof header.topBadge === "string" && header.topBadge) ||
          "OUR AWARDS";
        editorData.title =
          currentTitle &&
          currentTitle.toLowerCase() !== "awards & recognitions"
            ? currentTitle
            : [headerTitle.part1, headerTitle.part2]
                .filter(
                  (part): part is string =>
                    typeof part === "string" && Boolean(part.trim()),
                )
                .join(" ") || "Awards & Recognition";
        editorData.desc =
          (typeof editorData.desc === "string" && editorData.desc) ||
          (typeof header.pretitle === "string" && header.pretitle) ||
          "";
        const sourceStats = Array.isArray(editorData.stats)
          ? editorData.stats
          : [];
        editorData.stats = sourceStats.map((card) => {
          if (!card || typeof card !== "object" || Array.isArray(card)) {
            return card;
          }
          const item = card as Record<string, unknown>;
          const icon =
            (typeof item.icon === "string" && item.icon) ||
            (typeof item.iconName === "string" && item.iconName) ||
            "star";
          return { ...item, icon, iconName: icon };
        });
      }

      if (awardsLabel === "awards grid") {
        editorData.awardsLabel =
          (typeof editorData.awardsLabel === "string" &&
            editorData.awardsLabel) ||
          (typeof awardsSection.topBadge === "string" &&
            awardsSection.topBadge) ||
          "HONORED FOR OUR IMPACT";
        editorData.awardsTitle =
          (typeof editorData.awardsTitle === "string" &&
            editorData.awardsTitle) ||
          (typeof awardsSection.title === "string" && awardsSection.title) ||
          "Recognitions That Motivate Us";
        const sourceAwards = Array.isArray(editorData.awards)
          ? editorData.awards
          : Array.isArray(awardsSection.awards)
            ? awardsSection.awards
            : [];
        editorData.awards = sourceAwards.map((card) => {
          if (!card || typeof card !== "object" || Array.isArray(card)) {
            return card;
          }
          const item = card as Record<string, unknown>;
          const imageValue = item.image;
          const imageSrc =
            typeof imageValue === "string"
              ? imageValue
              : imageValue &&
                  typeof imageValue === "object" &&
                  !Array.isArray(imageValue) &&
                  typeof (imageValue as { src?: unknown }).src === "string"
                ? (imageValue as { src: string }).src
                : "";
          return {
            ...item,
            image: imageSrc,
            description:
              (typeof item.description === "string" && item.description) ||
              (typeof item.desc === "string" && item.desc) ||
              "",
          };
        });
      }

      if (awardsLabel === "awards support") {
        editorData.supportLabel =
          (typeof editorData.supportLabel === "string" &&
            editorData.supportLabel) ||
          (typeof supportBanner.topBadge === "string" &&
            supportBanner.topBadge) ||
          "TOGETHER WE ACHIEVE MORE";
        editorData.supportTitle =
          (typeof editorData.supportTitle === "string" &&
            editorData.supportTitle) ||
          (typeof supportTitle.line1 === "string" && supportTitle.line1) ||
          "Your Support Builds";
        editorData.supportTitleHighlight =
          (typeof editorData.supportTitleHighlight === "string" &&
            editorData.supportTitleHighlight) ||
          (typeof supportTitle.line2 === "string" && supportTitle.line2) ||
          "Our Success";
        editorData.supportDesc =
          (typeof editorData.supportDesc === "string" &&
            editorData.supportDesc) ||
          (typeof supportBanner.description === "string" &&
            supportBanner.description) ||
          "";
        editorData.supportImage =
          (typeof editorData.supportImage === "string" &&
            editorData.supportImage) ||
          (typeof trophyImage.src === "string" && trophyImage.src) ||
          "";
        const existingButton =
          editorData.supportButton &&
          typeof editorData.supportButton === "object" &&
          !Array.isArray(editorData.supportButton)
            ? (editorData.supportButton as Record<string, unknown>)
            : {};
        editorData.supportButton = {
          label:
            (typeof existingButton.label === "string" &&
              existingButton.label) ||
            (typeof supportCta.text === "string" && supportCta.text) ||
            "Support Our Mission",
          href:
            (typeof existingButton.href === "string" && existingButton.href) ||
            (typeof supportCta.url === "string" && supportCta.url) ||
            "/contact-us",
        };
      }

      if (awardsLabel === "awards transparency") {
        editorData.transparencyTitle =
          (typeof editorData.transparencyTitle === "string" &&
            editorData.transparencyTitle) ||
          (typeof transparencyBanner.title === "string" &&
            transparencyBanner.title) ||
          "We are committed to transparency and accountability.";
        editorData.transparencyDesc =
          (typeof editorData.transparencyDesc === "string" &&
            editorData.transparencyDesc) ||
          (typeof transparencyBanner.pretitle === "string" &&
            transparencyBanner.pretitle) ||
          "";
        const existingButton =
          editorData.transparencyButton &&
          typeof editorData.transparencyButton === "object" &&
          !Array.isArray(editorData.transparencyButton)
            ? (editorData.transparencyButton as Record<string, unknown>)
            : {};
        editorData.transparencyButton = {
          label:
            (typeof existingButton.label === "string" &&
              existingButton.label) ||
            (typeof transparencyCta.text === "string" &&
              transparencyCta.text) ||
            "Learn More About Us",
          href:
            (typeof existingButton.href === "string" && existingButton.href) ||
            (typeof transparencyCta.url === "string" && transparencyCta.url) ||
            "/about-us",
        };
      }
    }

    if (category === "NGO" && activeSectionType === "Careers") {
      const careersLabel =
        subsectionScope?.label.trim().toLowerCase() ?? "";
      const whyWorkWithUs =
        editorData.whyWorkWithUs &&
        typeof editorData.whyWorkWithUs === "object" &&
        !Array.isArray(editorData.whyWorkWithUs)
          ? (editorData.whyWorkWithUs as Record<string, unknown>)
          : {};
      const nestedCta =
        editorData.cta &&
        typeof editorData.cta === "object" &&
        !Array.isArray(editorData.cta)
          ? (editorData.cta as Record<string, unknown>)
          : {};
      const nestedCtaButton =
        nestedCta.button &&
        typeof nestedCta.button === "object" &&
        !Array.isArray(nestedCta.button)
          ? (nestedCta.button as Record<string, unknown>)
          : {};

      if (["", "careers overview"].includes(careersLabel)) {
        const currentTitle =
          typeof editorData.title === "string" ? editorData.title.trim() : "";
        editorData.title =
          currentTitle && currentTitle.toLowerCase() !== "career"
            ? currentTitle
            : (typeof whyWorkWithUs.title === "string" &&
                whyWorkWithUs.title) ||
              "Why Work With Us?";
        editorData.desc =
          (typeof editorData.desc === "string" && editorData.desc) ||
          (typeof whyWorkWithUs.description === "string" &&
            whyWorkWithUs.description) ||
          (typeof editorData.description === "string" &&
            editorData.description) ||
          "";
        const sourceBenefits = Array.isArray(editorData.benefits)
          ? editorData.benefits
          : Array.isArray(whyWorkWithUs.benefits)
            ? whyWorkWithUs.benefits
            : [];
        // Keep nested whyWorkWithUs.benefits in sync so canvas/delete
        // do not fall back to the original nested list.
        editorData.benefits = sourceBenefits.map((card) => {
          if (!card || typeof card !== "object" || Array.isArray(card)) {
            return card;
          }
          const item = card as Record<string, unknown>;
          const description =
            (typeof item.description === "string" && item.description) ||
            (typeof item.desc === "string" && item.desc) ||
            "";
          return {
            ...item,
            icon:
              (typeof item.icon === "string" && item.icon) ||
              (typeof item.iconName === "string" && item.iconName) ||
              "heart",
            description,
            desc: description,
          };
        });
      }

      if (careersLabel === "open roles") {
        editorData.rolesTitle =
          (typeof editorData.rolesTitle === "string" &&
            editorData.rolesTitle) ||
          "Open Positions";
        editorData.rolesApplyLabel =
          (typeof editorData.rolesApplyLabel === "string" &&
            editorData.rolesApplyLabel) ||
          "Job details";
        editorData.jobs = Array.isArray(editorData.jobs)
          ? editorData.jobs
          : Array.isArray(editorData.roles)
            ? editorData.roles
            : [];
        if (
          !editorData.applyForm ||
          typeof editorData.applyForm !== "object" ||
          Array.isArray(editorData.applyForm)
        ) {
          editorData.applyForm = {};
        }
      }

      if (careersLabel === "careers cta") {
        editorData.ctaTitle =
          (typeof editorData.ctaTitle === "string" && editorData.ctaTitle) ||
          (typeof nestedCta.title === "string" && nestedCta.title) ||
          "";
        editorData.ctaDesc =
          (typeof editorData.ctaDesc === "string" && editorData.ctaDesc) ||
          (typeof nestedCta.description === "string" &&
            nestedCta.description) ||
          "";
        const existingButton =
          editorData.ctaButton &&
          typeof editorData.ctaButton === "object" &&
          !Array.isArray(editorData.ctaButton)
            ? (editorData.ctaButton as Record<string, unknown>)
            : {};
        editorData.ctaButton = {
          label:
            (typeof existingButton.label === "string" &&
              existingButton.label) ||
            (typeof nestedCtaButton.label === "string" &&
              nestedCtaButton.label) ||
            "Send Your Resume",
          href:
            (typeof existingButton.href === "string" && existingButton.href) ||
            (typeof nestedCtaButton.href === "string" &&
              nestedCtaButton.href) ||
            "/apply-form",
        };
      }
    }

    if (
      category === "NGO" &&
      (activeSectionType === "Projects" ||
        activeSectionType === "ProjectsPage") &&
      Array.isArray(editorData.items)
    ) {
      editorData.items = editorData.items.map((card) => {
        if (!card || typeof card !== "object" || Array.isArray(card)) {
          return card;
        }
        const item = card as Record<string, unknown>;
        const imageValue = item.image;
        const imageSrc =
          typeof imageValue === "string"
            ? imageValue
            : imageValue &&
                typeof imageValue === "object" &&
                !Array.isArray(imageValue) &&
                typeof (imageValue as { src?: unknown }).src === "string"
              ? (imageValue as { src: string }).src
              : "";
        const button =
          item.button &&
          typeof item.button === "object" &&
          !Array.isArray(item.button)
            ? (item.button as Record<string, unknown>)
            : {};
        return {
          ...item,
          image: imageSrc,
          button: {
            label:
              (typeof button.label === "string" && button.label) ||
              "Learn More",
            href:
              (typeof button.href === "string" && button.href) ||
              "/project-detail",
          },
        };
      });
    }

    if (activeSectionType === "CitiesWeServe") {
      const categoryValues = Array.isArray(editorData.categories)
        ? editorData.categories.filter(
          (item): item is string => typeof item === "string",
        )
        : [];

      return {
        ...editorData,
        tabs: Array.isArray(editorData.tabs)
          ? editorData.tabs
          : categoryValues,
      };
    }

    if (activeSectionType === "PopularEvents") {
      const categoryValues = Array.isArray(editorData.categories)
        ? editorData.categories.filter(
          (item): item is string => typeof item === "string",
        )
        : [];

      return {
        ...editorData,
        tabs: Array.isArray(editorData.tabs) &&
          editorData.tabs.some(
            (item) => typeof item === "string" && item.trim(),
          )
          ? editorData.tabs.filter(
            (item): item is string => typeof item === "string",
          )
          : categoryValues,
      };
    }

    if (activeVariant === "RealEstateProject1") {
      const categoryValues = Array.isArray(editorData.projectItems)
        ? Array.from(
          new Set(
            editorData.projectItems.flatMap((item) => {
              if (!item || typeof item !== "object" || Array.isArray(item)) {
                return [];
              }
              const category = (item as Record<string, unknown>).category;
              return typeof category === "string" && category.trim()
                ? [category]
                : [];
            }),
          ),
        )
        : [];

      return {
        ...editorData,
        tabs: Array.isArray(editorData.tabs)
          ? editorData.tabs
          : ["All", ...categoryValues],
      };
    }

    if (activeVariant === "RealEstateBlogDetail1") {
      return {
        ...editorData,
        primaryButtonLabel:
          typeof editorData.primaryButtonLabel === "string"
            ? editorData.primaryButtonLabel
            : "Talk to an advisor",
        primaryButtonHref:
          typeof editorData.primaryButtonHref === "string"
            ? editorData.primaryButtonHref
            : "/contact",
        secondaryButtonLabel:
          typeof editorData.secondaryButtonLabel === "string"
            ? editorData.secondaryButtonLabel
            : "All articles",
        secondaryButtonHref:
          typeof editorData.secondaryButtonHref === "string"
            ? editorData.secondaryButtonHref
            : "/blog",
      };
    }

    if (activeVariant === "RealEstateCareerPage1") {
      return {
        ...editorData,
        formPretitle:
          typeof editorData.formPretitle === "string"
            ? editorData.formPretitle
            : "Application form",
        formTitle:
          typeof editorData.formTitle === "string"
            ? editorData.formTitle
            : "Apply for",
        formFields: Array.isArray(editorData.formFields)
          ? editorData.formFields
          : defaultCareerFormFields,
        applyLabel:
          typeof editorData.applyLabel === "string"
            ? editorData.applyLabel
            : "Submit application",
        successTitle:
          typeof editorData.successTitle === "string"
            ? editorData.successTitle
            : "Application received.",
        successDesc:
          typeof editorData.successDesc === "string"
            ? editorData.successDesc
            : "Thanks for your interest. Our team will review your details and contact you if the role is a match.",
        successButtonLabel:
          typeof editorData.successButtonLabel === "string"
            ? editorData.successButtonLabel
            : "Apply for another role",
      };
    }

    if (
      category === "NGO" &&
      activeSectionType === "Gallery" &&
      ["", "gallery", "gallery grid", "gallery content"].includes(
        subsectionScope?.label.trim().toLowerCase() ?? "",
      )
    ) {
      const badge =
        editorData.badge &&
        typeof editorData.badge === "object" &&
        !Array.isArray(editorData.badge)
          ? (editorData.badge as Record<string, unknown>)
          : {};
      const titleObject =
        editorData.title &&
        typeof editorData.title === "object" &&
        !Array.isArray(editorData.title)
          ? (editorData.title as Record<string, unknown>)
          : {};
      editorData.pretitle =
        (typeof editorData.pretitle === "string" && editorData.pretitle.trim()) ||
        (typeof badge.label === "string" && badge.label.trim()) ||
        "Our Gallery";
      editorData.title =
        typeof editorData.title === "string" && editorData.title.trim()
          ? editorData.title
          : [titleObject.line1, titleObject.highlight, titleObject.line2]
              .filter(
                (part): part is string =>
                  typeof part === "string" && Boolean(part.trim()),
              )
              .join(" ")
              .trim() || "Moments of Impact";
      editorData.desc =
        (typeof editorData.desc === "string" && editorData.desc) ||
        (typeof editorData.description === "string" && editorData.description) ||
        "";
    }

    if (
      category === "NGO" &&
      (activeSectionType === "FAQ" || activeSectionType === "FAQPage") &&
      ["", "faq", "faqs", "faq content"].includes(
        subsectionScope?.label.trim().toLowerCase() ?? "",
      )
    ) {
      const badge =
        editorData.badge &&
        typeof editorData.badge === "object" &&
        !Array.isArray(editorData.badge)
          ? (editorData.badge as Record<string, unknown>)
          : {};
      const titleObject =
        editorData.title &&
        typeof editorData.title === "object" &&
        !Array.isArray(editorData.title)
          ? (editorData.title as Record<string, unknown>)
          : {};
      editorData.pretitle =
        (typeof editorData.pretitle === "string" && editorData.pretitle.trim()) ||
        (typeof badge.label === "string" && badge.label.trim()) ||
        "Frequently Asked Questions";
      editorData.title =
        typeof editorData.title === "string" && editorData.title.trim()
          ? editorData.title
          : [titleObject.line1, titleObject.highlight, titleObject.line2]
              .filter(
                (part): part is string =>
                  typeof part === "string" && Boolean(part.trim()),
              )
              .join(" ")
              .trim() || "Have Any Questions?";
      editorData.desc =
        (typeof editorData.desc === "string" && editorData.desc) ||
        (typeof editorData.description === "string" && editorData.description) ||
        "";
      if (!Array.isArray(editorData.questions) || editorData.questions.length === 0) {
        editorData.questions = Array.isArray(editorData.faqs)
          ? editorData.faqs
          : Array.isArray(editorData.items)
            ? editorData.items
            : Array.isArray(editorData.faqItems)
              ? editorData.faqItems
              : [];
      }
    }

    if (
      category === "NGO" &&
      (activeSectionType === "Partners" || activeSectionType === "PartnersPage") &&
      ["", "partners", "partners content", "partners list"].includes(
        subsectionScope?.label.trim().toLowerCase() ?? "",
      )
    ) {
      const badge =
        editorData.badge &&
        typeof editorData.badge === "object" &&
        !Array.isArray(editorData.badge)
          ? (editorData.badge as Record<string, unknown>)
          : {};
      const titleObject =
        editorData.title &&
        typeof editorData.title === "object" &&
        !Array.isArray(editorData.title)
          ? (editorData.title as Record<string, unknown>)
          : {};
      editorData.pretitle =
        (typeof editorData.pretitle === "string" && editorData.pretitle.trim()) ||
        (typeof badge.label === "string" && badge.label.trim()) ||
        "Together We Grow";
      editorData.title =
        typeof editorData.title === "string" && editorData.title.trim()
          ? editorData.title
          : [titleObject.line1, titleObject.highlight, titleObject.line2]
              .filter(
                (part): part is string =>
                  typeof part === "string" && Boolean(part.trim()),
              )
              .join(" ")
              .trim() || "Partners & Sponsors";
      editorData.desc =
        (typeof editorData.desc === "string" && editorData.desc) ||
        (typeof editorData.description === "string" && editorData.description) ||
        "";
      if (!Array.isArray(editorData.partnersList) || editorData.partnersList.length === 0) {
        editorData.partnersList = Array.isArray(editorData.partners)
          ? editorData.partners
          : Array.isArray(editorData.cards)
            ? editorData.cards
            : [];
      }
    }

    if (
      category === "NGO" &&
      (activeSectionType === "CSR" || activeSectionType === "CSRPage")
    ) {
      const asRecord = (value: unknown): Record<string, unknown> =>
        value && typeof value === "object" && !Array.isArray(value)
          ? (value as Record<string, unknown>)
          : {};
      const toPlain = (value: unknown) => {
        if (typeof value === "string") return value;
        const rec = asRecord(value);
        return [rec.part1, rec.part2, rec.plainText, rec.highlightedText, rec.line1, rec.highlight]
          .filter((part): part is string => typeof part === "string" && Boolean(part.trim()))
          .join(" ")
          .trim();
      };
      const withIcon = (items: unknown[]) =>
        items.map((item) => {
          if (!item || typeof item !== "object" || Array.isArray(item)) return item;
          const rec = item as Record<string, unknown>;
          const icon =
            (typeof rec.icon === "string" && rec.icon) ||
            (typeof rec.iconName === "string" && rec.iconName) ||
            "heart";
          return {
            ...rec,
            icon,
            iconName: icon,
          };
        });
      const csrLabel = subsectionScope?.label.trim().toLowerCase() ?? "";
      const header = asRecord(editorData.header);
      const focusAreas = asRecord(editorData.focusAreas);
      const ourImpact = asRecord(editorData.ourImpact);
      const csrProjects = asRecord(editorData.csrProjects);
      const bannerCta = asRecord(editorData.bannerCta);
      const coreValues = asRecord(editorData.coreValues);
      const nestedImpactButton = asRecord(ourImpact.ctaButton);

      if (["", "csr intro", "csr overview"].includes(csrLabel)) {
        const banner = asRecord(editorData.banner);
        const breadcrumbCurrent =
          typeof banner.breadcrumbCurrent === "string"
            ? banner.breadcrumbCurrent.trim()
            : "";
        const isBannerTitle = (value: string) => {
          const normalized = value.trim().toLowerCase();
          return (
            !normalized ||
            normalized === "csr" ||
            (Boolean(breadcrumbCurrent) &&
              normalized === breadcrumbCurrent.toLowerCase())
          );
        };
        editorData.pretitle =
          (typeof editorData.pretitle === "string" && editorData.pretitle) ||
          (typeof header.topBadge === "string" && header.topBadge) ||
          "OUR CSR INITIATIVES";
        const currentTitle =
          typeof editorData.title === "string" ? editorData.title.trim() : "";
        editorData.title =
          currentTitle && !isBannerTitle(currentTitle)
            ? currentTitle
            : toPlain(header.title) ||
              "We Care. We Act. We Make a Difference.";
        editorData.desc =
          (typeof editorData.desc === "string" && editorData.desc) ||
          (typeof editorData.description === "string" && editorData.description) ||
          (typeof header.pretitle === "string" && header.pretitle) ||
          "";
        editorData.stats = withIcon(
          Array.isArray(editorData.stats) ? editorData.stats : [],
        );
      }

      if (csrLabel === "focus areas") {
        editorData.focusPretitle =
          (typeof editorData.focusPretitle === "string" && editorData.focusPretitle) ||
          (typeof focusAreas.topBadge === "string" && focusAreas.topBadge) ||
          "OUR FOCUS AREAS";
        editorData.focusItems = withIcon(
          Array.isArray(editorData.focusItems) && editorData.focusItems.length
            ? editorData.focusItems
            : Array.isArray(focusAreas.items)
              ? focusAreas.items
              : [],
        );
      }

      if (csrLabel === "our impact") {
        editorData.impactPretitle =
          (typeof editorData.impactPretitle === "string" && editorData.impactPretitle) ||
          (typeof ourImpact.topBadge === "string" && ourImpact.topBadge) ||
          "OUR IMPACT";
        editorData.impactDesc =
          (typeof editorData.impactDesc === "string" && editorData.impactDesc) ||
          (typeof ourImpact.description === "string" && ourImpact.description) ||
          "";
        const existingButton = asRecord(editorData.impactButton);
        editorData.impactButton = {
          label:
            (typeof existingButton.label === "string" && existingButton.label) ||
            (typeof nestedImpactButton.label === "string" && nestedImpactButton.label) ||
            (typeof nestedImpactButton.text === "string" && nestedImpactButton.text) ||
            "Learn More About Our Impact",
          href:
            (typeof existingButton.href === "string" && existingButton.href) ||
            (typeof nestedImpactButton.href === "string" && nestedImpactButton.href) ||
            "/about-us",
        };
        editorData.pillars = withIcon(
          Array.isArray(editorData.pillars) && editorData.pillars.length
            ? editorData.pillars
            : Array.isArray(ourImpact.pillars)
              ? ourImpact.pillars
              : [],
        );
      }

      if (csrLabel === "csr projects") {
        editorData.projectsPretitle =
          (typeof editorData.projectsPretitle === "string" &&
            editorData.projectsPretitle) ||
          (typeof csrProjects.topBadge === "string" && csrProjects.topBadge) ||
          "OUR CSR PROJECTS";
        editorData.csrProjectItems =
          Array.isArray(editorData.csrProjectItems) && editorData.csrProjectItems.length
            ? editorData.csrProjectItems
            : Array.isArray(csrProjects.items)
              ? csrProjects.items
              : [];
      }

      if (csrLabel === "csr cta") {
        const existingCta = asRecord(editorData.ctaButton);
        editorData.ctaTitle =
          (typeof editorData.ctaTitle === "string" && editorData.ctaTitle) ||
          (typeof bannerCta.title === "string" && bannerCta.title) ||
          "Together, We Can Build a Better Tomorrow";
        editorData.ctaDesc =
          (typeof editorData.ctaDesc === "string" && editorData.ctaDesc) ||
          (typeof bannerCta.description === "string" && bannerCta.description) ||
          "";
        editorData.ctaButton = {
          label:
            (typeof existingCta.label === "string" && existingCta.label) ||
            (typeof bannerCta.buttonText === "string" && bannerCta.buttonText) ||
            "Partner With Us",
          href:
            (typeof existingCta.href === "string" && existingCta.href) ||
            (typeof bannerCta.href === "string" && bannerCta.href) ||
            "/contact-us",
        };
      }

      if (csrLabel === "core values") {
        editorData.coreValueItems = withIcon(
          Array.isArray(editorData.coreValueItems) && editorData.coreValueItems.length
            ? editorData.coreValueItems
            : Array.isArray(coreValues.items)
              ? coreValues.items
              : [],
        );
      }
    }

    if (
      category === "NGO" &&
      (activeSectionType === "Brochure" || activeSectionType === "BrochurePage")
    ) {
      const asRecord = (value: unknown): Record<string, unknown> =>
        value && typeof value === "object" && !Array.isArray(value)
          ? (value as Record<string, unknown>)
          : {};
      const header = asRecord(editorData.header);
      const sectionTitle = asRecord(editorData.sectionTitle);
      const ctaSection = asRecord(editorData.ctaSection);
      const banner = asRecord(editorData.banner);
      const label = subsectionScope?.label.trim().toLowerCase() ?? "";
      const breadcrumbCurrent =
        typeof banner.breadcrumbCurrent === "string"
          ? banner.breadcrumbCurrent.trim()
          : "";
      const isBannerTitle = (value: string) => {
        const normalized = value.trim().toLowerCase();
        return (
          !normalized ||
          normalized === "brochure" ||
          (Boolean(breadcrumbCurrent) &&
            normalized === breadcrumbCurrent.toLowerCase())
        );
      };

      if (["", "brochure intro"].includes(label)) {
        editorData.pretitle =
          (typeof editorData.pretitle === "string" && editorData.pretitle) ||
          (typeof header.label === "string" && header.label) ||
          "BROCHURES";
        const currentTitle =
          typeof editorData.title === "string" ? editorData.title.trim() : "";
        const heading =
          (typeof editorData.heading === "string" && editorData.heading.trim()) ||
          (typeof header.heading === "string" && header.heading.trim()) ||
          "";
        editorData.title =
          currentTitle && !isBannerTitle(currentTitle)
            ? currentTitle
            : heading || "Explore Our Brochures";
        editorData.desc =
          (typeof editorData.desc === "string" && editorData.desc) ||
          (typeof editorData.description === "string" && editorData.description) ||
          (typeof header.description === "string" && header.description) ||
          "";
        if (!Array.isArray(editorData.features)) {
          editorData.features = Array.isArray(header.features)
            ? header.features
            : [];
        }
      }

      if (["brochures", "brochure list"].includes(label)) {
        editorData.listPretitle =
          (typeof editorData.listPretitle === "string" && editorData.listPretitle) ||
          (typeof sectionTitle.label === "string" && sectionTitle.label) ||
          "OUR BROCHURES";
        editorData.listTitle =
          (typeof editorData.listTitle === "string" && editorData.listTitle) ||
          (typeof sectionTitle.heading === "string" && sectionTitle.heading) ||
          "Inform. Inspire. Involve.";
        if (!Array.isArray(editorData.brochures)) {
          editorData.brochures = [];
        }
      }

      if (["together we can", "brochure cta"].includes(label)) {
        const primary = asRecord(editorData.ctaPrimaryButton);
        const nestedPrimary = asRecord(ctaSection.primaryButton);
        const secondary = asRecord(editorData.ctaSecondaryButton);
        const nestedSecondary = asRecord(ctaSection.secondaryButton);
        editorData.ctaPretitle =
          (typeof editorData.ctaPretitle === "string" && editorData.ctaPretitle) ||
          (typeof ctaSection.label === "string" && ctaSection.label) ||
          "TOGETHER WE CAN";
        editorData.ctaTitle =
          (typeof editorData.ctaTitle === "string" && editorData.ctaTitle) ||
          (typeof ctaSection.title === "string" && ctaSection.title) ||
          "Be a Part of the Change";
        editorData.ctaDesc =
          (typeof editorData.ctaDesc === "string" && editorData.ctaDesc) ||
          (typeof ctaSection.description === "string" && ctaSection.description) ||
          "";
        editorData.ctaPrimaryButton = {
          label:
            (typeof primary.label === "string" && primary.label) ||
            (typeof nestedPrimary.label === "string" && nestedPrimary.label) ||
            "Donate Now",
          href:
            (typeof primary.href === "string" && primary.href) ||
            (typeof nestedPrimary.href === "string" && nestedPrimary.href) ||
            "/donate",
        };
        editorData.ctaSecondaryButton = {
          label:
            (typeof secondary.label === "string" && secondary.label) ||
            (typeof nestedSecondary.label === "string" && nestedSecondary.label) ||
            "Join Us",
          href:
            (typeof secondary.href === "string" && secondary.href) ||
            (typeof nestedSecondary.href === "string" && nestedSecondary.href) ||
            "/contact-us",
        };
        if (!Array.isArray(editorData.ctaStats) || editorData.ctaStats.length === 0) {
          editorData.ctaStats = Array.isArray(ctaSection.stats)
            ? ctaSection.stats
            : [];
        }
      }
    }

    if (category === "NGO" && activeSectionType === "CaseStudy") {
      const asRecord = (value: unknown): Record<string, unknown> =>
        value && typeof value === "object" && !Array.isArray(value)
          ? (value as Record<string, unknown>)
          : {};
      const badge = asRecord(editorData.badge);
      const titleObject = asRecord(editorData.title);
      const nestedCta = asRecord(editorData.cta);
      const nestedButton = asRecord(nestedCta.button);
      const existingButton = asRecord(editorData.ctaButton);
      const label = subsectionScope?.label.trim().toLowerCase() ?? "";

      if (["", "case study overview", "case studies"].includes(label)) {
        editorData.pretitle =
          (typeof editorData.pretitle === "string" && editorData.pretitle) ||
          (typeof badge.label === "string" && badge.label) ||
          "Our Causes";
        const currentTitle =
          typeof editorData.title === "string" ? editorData.title.trim() : "";
        const heading =
          (typeof editorData.heading === "string" && editorData.heading.trim()) ||
          [titleObject.line1, titleObject.highlight, titleObject.line2]
            .filter((part): part is string => typeof part === "string" && Boolean(part.trim()))
            .join(" ");
        const isBannerTitle = (value: string) => {
          const normalized = value.trim().toLowerCase();
          return (
            !normalized ||
            normalized === "case study" ||
            normalized === "case study details"
          );
        };
        editorData.title =
          currentTitle && !isBannerTitle(currentTitle)
            ? currentTitle
            : heading || "The Causes We Care About";
        editorData.desc =
          (typeof editorData.desc === "string" && editorData.desc) ||
          (typeof editorData.description === "string" && editorData.description) ||
          "";
        if (!Array.isArray(editorData.items)) {
          editorData.items = [];
        }
      }

      if (label === "case study cta") {
        editorData.ctaTitle =
          (typeof editorData.ctaTitle === "string" && editorData.ctaTitle) ||
          (typeof nestedCta.title === "string" && nestedCta.title) ||
          "Want You Know How Can Help?";
        editorData.ctaDesc =
          (typeof editorData.ctaDesc === "string" && editorData.ctaDesc) ||
          (typeof nestedCta.description === "string" && nestedCta.description) ||
          "";
        editorData.ctaButton = {
          label:
            (typeof existingButton.label === "string" && existingButton.label) ||
            (typeof nestedButton.label === "string" && nestedButton.label) ||
            "Donate Now",
          href:
            (typeof existingButton.href === "string" && existingButton.href) ||
            (typeof nestedButton.href === "string" && nestedButton.href) ||
            "/donate",
        };
      }
    }

    if (
      category === "NGO" &&
      (activeSectionType === "CaseDetails" ||
        activeSectionType === "CaseDetailsPage")
    ) {
      const asRecord = (value: unknown): Record<string, unknown> =>
        value && typeof value === "object" && !Array.isArray(value)
          ? (value as Record<string, unknown>)
          : {};
      const mainContent = asRecord(editorData.mainContent);
      const sidebar = asRecord(editorData.sidebar);
      const primary = asRecord(mainContent.primaryArticle);
      const secondary = asRecord(mainContent.secondaryArticle);
      const nestedImage = asRecord(primary.mainImage);
      const label = subsectionScope?.label.trim().toLowerCase() ?? "";
      const isContentEditor =
        label === "" ||
        label === "article" ||
        label === "article content" ||
        label === "sidebar" ||
        label === "popular posts";

      if (isContentEditor) {
        editorData.pageTitle =
          (typeof editorData.pageTitle === "string" && editorData.pageTitle) ||
          "Case Study Detail";
        editorData.primaryTitle =
          (typeof editorData.primaryTitle === "string" && editorData.primaryTitle) ||
          (typeof primary.title === "string" && primary.title) ||
          "";
        editorData.primaryImage =
          (typeof editorData.primaryImage === "string" && editorData.primaryImage) ||
          (typeof nestedImage.src === "string" && nestedImage.src) ||
          "";
        editorData.primaryImageAlt =
          (typeof editorData.primaryImageAlt === "string" &&
            editorData.primaryImageAlt) ||
          (typeof nestedImage.alt === "string" && nestedImage.alt) ||
          "";
        if (!Array.isArray(editorData.primaryParagraphs)) {
          editorData.primaryParagraphs = Array.isArray(primary.paragraphs)
            ? primary.paragraphs
            : [];
        }
        editorData.postedOn =
          (typeof editorData.postedOn === "string" && editorData.postedOn) ||
          (typeof secondary.postedOn === "string" && secondary.postedOn) ||
          "";
        editorData.secondaryTitle =
          (typeof editorData.secondaryTitle === "string" &&
            editorData.secondaryTitle) ||
          (typeof secondary.title === "string" && secondary.title) ||
          "";
        if (!Array.isArray(editorData.secondaryParagraphs)) {
          editorData.secondaryParagraphs = Array.isArray(secondary.paragraphs)
            ? secondary.paragraphs
            : [];
        }
        editorData.popularPostsTitle =
          (typeof editorData.popularPostsTitle === "string" &&
            editorData.popularPostsTitle) ||
          (typeof sidebar.popularPostsTitle === "string" &&
            sidebar.popularPostsTitle) ||
          "Popular Posts";
        if (!Array.isArray(editorData.popularPosts)) {
          const rawPosts = Array.isArray(sidebar.popularPosts)
            ? sidebar.popularPosts
            : [];
          editorData.popularPosts = rawPosts.map((post) => {
            const record =
              post && typeof post === "object" && !Array.isArray(post)
                ? (post as Record<string, unknown>)
                : {};
            const image = record.image;
            const imageSrc =
              typeof image === "string"
                ? image
                : image &&
                    typeof image === "object" &&
                    !Array.isArray(image) &&
                    typeof (image as Record<string, unknown>).src === "string"
                  ? String((image as Record<string, unknown>).src)
                  : "";
            return {
              ...record,
              image: imageSrc,
            };
          });
        }
      }
    }

    if (category === "NGO" && activeSectionType === "TestimonialsPage") {
      const asRecord = (value: unknown): Record<string, unknown> =>
        value && typeof value === "object" && !Array.isArray(value)
          ? (value as Record<string, unknown>)
          : {};
      const badge = asRecord(editorData.badge);
      const titleObject = asRecord(editorData.title);
      const banner = asRecord(editorData.banner);
      const label = subsectionScope?.label.trim().toLowerCase() ?? "";
      const breadcrumbCurrent =
        typeof banner.breadcrumbCurrent === "string"
          ? banner.breadcrumbCurrent.trim()
          : "";
      const isBannerTitle = (value: string) => {
        const normalized = value.trim().toLowerCase();
        return (
          !normalized ||
          normalized === "testimonial" ||
          (Boolean(breadcrumbCurrent) &&
            normalized === breadcrumbCurrent.toLowerCase())
        );
      };

      if (
        [
          "",
          "testimonial intro",
          "testimonial content",
          "testimonials",
          "testimonials content",
        ].includes(label)
      ) {
        editorData.pretitle =
          (typeof editorData.pretitle === "string" && editorData.pretitle) ||
          (typeof badge.label === "string" && badge.label) ||
          "Testimonials";
        const currentTitle =
          typeof editorData.title === "string" ? editorData.title.trim() : "";
        editorData.title =
          currentTitle && !isBannerTitle(currentTitle)
            ? currentTitle
            : (typeof titleObject.line1 === "string" && titleObject.line1.trim()) ||
              "Don't Believe Us?";
        editorData.highlight =
          (typeof editorData.highlight === "string" && editorData.highlight) ||
          (typeof titleObject.highlight === "string" && titleObject.highlight) ||
          "See Review";
        editorData.desc =
          (typeof editorData.desc === "string" && editorData.desc) ||
          (typeof editorData.description === "string" && editorData.description) ||
          "";
        if (!Array.isArray(editorData.testimonials) || editorData.testimonials.length === 0) {
          editorData.testimonials = Array.isArray(editorData.items)
            ? editorData.items
            : [];
        }
      }
    }

    if (
      category === "NGO" &&
      activeSectionType === "Contact" &&
      subsectionScope?.label.trim().toLowerCase() === "map"
    ) {
      const map =
        editorData.map &&
        typeof editorData.map === "object" &&
        !Array.isArray(editorData.map)
          ? (editorData.map as Record<string, unknown>)
          : {};
      editorData.mapEmbedUrl =
        (typeof editorData.mapEmbedUrl === "string" && editorData.mapEmbedUrl) ||
        (typeof map.embedUrl === "string" && map.embedUrl) ||
        "";
    }

    if (
      category === "NGO" &&
      activeSectionType === "Contact" &&
      ["", "contact overview", "contact"].includes(
        subsectionScope?.label.trim().toLowerCase() ?? "",
      )
    ) {
      const office =
        editorData.office &&
        typeof editorData.office === "object" &&
        !Array.isArray(editorData.office)
          ? (editorData.office as Record<string, unknown>)
          : {};
      const asItem = (block: unknown, icon: string, fallbackTitle: string) => {
        if (!block || typeof block !== "object" || Array.isArray(block)) {
          return null;
        }
        const item = block as Record<string, unknown>;
        const title =
          (typeof item.title === "string" && item.title) ||
          (typeof item.label === "string" && item.label) ||
          fallbackTitle;
        const value = typeof item.value === "string" ? item.value : "";
        return { icon, title, value };
      };
      if (!Array.isArray(editorData.contactItems) || editorData.contactItems.length === 0) {
        editorData.contactItems = [
          asItem(office.address, "map-pin", "Office Address"),
          asItem(office.phone, "phone", "Phone Number"),
          asItem(office.email, "mail", "Email Address"),
          asItem(office.hours, "clock", "Working Hours"),
        ].filter(Boolean);
      } else {
        editorData.contactItems = editorData.contactItems.map((item) => {
          if (!item || typeof item !== "object" || Array.isArray(item)) return item;
          const record = item as Record<string, unknown>;
          return {
            ...record,
            title:
              (typeof record.title === "string" && record.title) ||
              (typeof record.label === "string" && record.label) ||
              "",
          };
        });
      }
      const form =
        editorData.form &&
        typeof editorData.form === "object" &&
        !Array.isArray(editorData.form)
          ? (editorData.form as Record<string, unknown>)
          : {};
      if (form.fields && !Array.isArray(form.fields) && typeof form.fields === "object") {
        const fields = form.fields as Record<string, unknown>;
        editorData.form = {
          ...form,
          fields: Object.entries(fields).map(([key, value]) => {
            const entry =
              value && typeof value === "object" && !Array.isArray(value)
                ? (value as Record<string, unknown>)
                : {};
            return {
              name: key,
              label: typeof entry.label === "string" ? entry.label : key,
              placeholder:
                typeof entry.placeholder === "string" ? entry.placeholder : "",
              type:
                typeof entry.type === "string"
                  ? entry.type
                  : key === "message"
                    ? "textarea"
                    : "text",
              width:
                typeof entry.width === "string"
                  ? entry.width
                  : key === "message"
                    ? "full"
                    : "half",
            };
          }),
        };
      }
    }

    if (category === "NGO" && isNGOFrenchiseSection) {
      const asRecord = (value: unknown): Record<string, unknown> =>
        value && typeof value === "object" && !Array.isArray(value)
          ? (value as Record<string, unknown>)
          : {};
      const header = asRecord(editorData.header);
      const leftSection = asRecord(editorData.leftSection);
      const form = asRecord(editorData.form);
      const processSection = asRecord(editorData.processSection);
      const contactBanner = asRecord(editorData.contactBanner);
      const nestedLeftImage = asRecord(leftSection.image);
      const nestedCtaImage = asRecord(contactBanner.image);
      const label = subsectionScope?.label.trim().toLowerCase() ?? "";
      const banner = asRecord(editorData.banner);
      const breadcrumbCurrent =
        typeof banner.breadcrumbCurrent === "string"
          ? banner.breadcrumbCurrent.trim()
          : "";
      const isBannerTitle = (value: string) => {
        const normalized = value.trim().toLowerCase();
        return (
          !normalized ||
          normalized === "franchise" ||
          normalized === "frenchise" ||
          (Boolean(breadcrumbCurrent) &&
            normalized === breadcrumbCurrent.toLowerCase())
        );
      };

      if (["", "franchise intro"].includes(label)) {
        editorData.pretitle =
          (typeof editorData.pretitle === "string" && editorData.pretitle) ||
          (typeof header.label === "string" && header.label) ||
          "FRANCHISE";
        const currentTitle =
          typeof editorData.title === "string" ? editorData.title.trim() : "";
        const heading =
          (typeof editorData.heading === "string" && editorData.heading.trim()) ||
          (typeof header.heading === "string" && header.heading.trim()) ||
          "";
        editorData.title =
          currentTitle && !isBannerTitle(currentTitle)
            ? currentTitle
            : heading || "Be a Part of Our Mission. Build a Better Tomorrow.";
        editorData.desc =
          (typeof editorData.desc === "string" && editorData.desc) ||
          (typeof header.description === "string" && header.description) ||
          "";
        if (!Array.isArray(editorData.features)) {
          editorData.features = Array.isArray(header.features)
            ? header.features
            : [];
        }
      }

      if (label === "franchise form") {
        editorData.leftPretitle =
          (typeof editorData.leftPretitle === "string" && editorData.leftPretitle) ||
          (typeof leftSection.label === "string" && leftSection.label) ||
          "WHY PARTNER WITH US?";
        editorData.leftTitle =
          (typeof editorData.leftTitle === "string" && editorData.leftTitle) ||
          (typeof leftSection.title === "string" && leftSection.title) ||
          "";
        editorData.leftDesc =
          (typeof editorData.leftDesc === "string" && editorData.leftDesc) ||
          (typeof leftSection.description === "string" && leftSection.description) ||
          "";
        if (!Array.isArray(editorData.leftPoints)) {
          editorData.leftPoints = Array.isArray(leftSection.points)
            ? leftSection.points
            : [];
        }
        editorData.leftImage =
          (typeof editorData.leftImage === "string" && editorData.leftImage) ||
          (typeof nestedLeftImage.src === "string" && nestedLeftImage.src) ||
          "";
        editorData.leftImageAlt =
          (typeof editorData.leftImageAlt === "string" && editorData.leftImageAlt) ||
          (typeof nestedLeftImage.alt === "string" && nestedLeftImage.alt) ||
          "";
        editorData.formTitle =
          (typeof editorData.formTitle === "string" && editorData.formTitle) ||
          (typeof form.title === "string" && form.title) ||
          "Enquire Now";
        editorData.formPretitle =
          (typeof editorData.formPretitle === "string" && editorData.formPretitle) ||
          (typeof form.pretitle === "string" && form.pretitle) ||
          "";
        if (form.fields && !Array.isArray(form.fields) && typeof form.fields === "object") {
          const fields = form.fields as Record<string, unknown>;
          editorData.form = {
            ...form,
            fields: Object.entries(fields).map(([key, value]) => {
              const entry = asRecord(value);
              return {
                name: key,
                label: typeof entry.label === "string" ? entry.label : key,
                placeholder:
                  typeof entry.placeholder === "string" ? entry.placeholder : "",
                type: typeof entry.type === "string" ? entry.type : "text",
                required: Boolean(entry.required),
                icon: typeof entry.icon === "string" ? entry.icon : "",
                options: Array.isArray(entry.options) ? entry.options : [],
              };
            }),
          };
        }
      }

      if (label === "franchise process") {
        editorData.processPretitle =
          (typeof editorData.processPretitle === "string" &&
            editorData.processPretitle) ||
          (typeof processSection.label === "string" && processSection.label) ||
          "OUR FRANCHISE PROCESS";
        editorData.processTitle =
          (typeof editorData.processTitle === "string" && editorData.processTitle) ||
          (typeof processSection.title === "string" && processSection.title) ||
          "";
        if (!Array.isArray(editorData.steps)) {
          editorData.steps = Array.isArray(processSection.steps)
            ? processSection.steps
            : [];
        }
      }

      if (label === "franchise cta") {
        editorData.ctaTitle =
          (typeof editorData.ctaTitle === "string" && editorData.ctaTitle) ||
          (typeof contactBanner.title === "string" && contactBanner.title) ||
          "Have Questions?";
        editorData.ctaPretitle =
          (typeof editorData.ctaPretitle === "string" && editorData.ctaPretitle) ||
          (typeof contactBanner.pretitle === "string" && contactBanner.pretitle) ||
          "";
        editorData.ctaDesc =
          (typeof editorData.ctaDesc === "string" && editorData.ctaDesc) ||
          (typeof contactBanner.description === "string" &&
            contactBanner.description) ||
          "";
        editorData.ctaPhone =
          (typeof editorData.ctaPhone === "string" && editorData.ctaPhone) ||
          (typeof contactBanner.phone === "string" && contactBanner.phone) ||
          "";
        editorData.ctaEmail =
          (typeof editorData.ctaEmail === "string" && editorData.ctaEmail) ||
          (typeof contactBanner.email === "string" && contactBanner.email) ||
          "";
        editorData.ctaHours =
          (typeof editorData.ctaHours === "string" && editorData.ctaHours) ||
          (typeof contactBanner.workingHours === "string" &&
            contactBanner.workingHours) ||
          "";
        editorData.ctaImage =
          (typeof editorData.ctaImage === "string" && editorData.ctaImage) ||
          (typeof nestedCtaImage.src === "string" && nestedCtaImage.src) ||
          "";
        editorData.ctaImageAlt =
          (typeof editorData.ctaImageAlt === "string" && editorData.ctaImageAlt) ||
          (typeof nestedCtaImage.alt === "string" && nestedCtaImage.alt) ||
          "";
      }
    }

    if (category === "NGO" && isNGOEnquirySection) {
      const asRecord = (value: unknown): Record<string, unknown> =>
        value && typeof value === "object" && !Array.isArray(value)
          ? (value as Record<string, unknown>)
          : {};
      const header = asRecord(editorData.header);
      const leftSection = asRecord(editorData.leftSection);
      const form = asRecord(editorData.form);
      const contactSection = asRecord(editorData.contactSection);
      const footerBanner = asRecord(editorData.footerBanner);
      const nestedLeftImage = asRecord(leftSection.image);
      const nestedButton = asRecord(footerBanner.button);
      const label = subsectionScope?.label.trim().toLowerCase() ?? "";
      const banner = asRecord(editorData.banner);
      const breadcrumbCurrent =
        typeof banner.breadcrumbCurrent === "string"
          ? banner.breadcrumbCurrent.trim()
          : "";
      const isBannerTitle = (value: string) => {
        const normalized = value.trim().toLowerCase();
        return (
          !normalized ||
          normalized === "enquiry" ||
          normalized === "enquiry now" ||
          (Boolean(breadcrumbCurrent) &&
            normalized === breadcrumbCurrent.toLowerCase())
        );
      };

      if (["", "enquiry intro", "enquiry form"].includes(label)) {
        editorData.pretitle =
          (typeof editorData.pretitle === "string" && editorData.pretitle) ||
          (typeof header.label === "string" && header.label) ||
          "ENQUIRY NOW";
        const currentTitle =
          typeof editorData.title === "string" ? editorData.title.trim() : "";
        const heading =
          (typeof editorData.heading === "string" && editorData.heading.trim()) ||
          (typeof header.heading === "string" && header.heading.trim()) ||
          "";
        editorData.title =
          currentTitle && !isBannerTitle(currentTitle)
            ? currentTitle
            : heading || "We're Here to Help You";
        editorData.desc =
          (typeof editorData.desc === "string" && editorData.desc) ||
          (typeof header.description === "string" && header.description) ||
          "";
        editorData.leftTitle =
          (typeof editorData.leftTitle === "string" && editorData.leftTitle) ||
          (typeof leftSection.title === "string" && leftSection.title) ||
          "";
        editorData.leftDesc =
          (typeof editorData.leftDesc === "string" && editorData.leftDesc) ||
          (typeof leftSection.description === "string" &&
            leftSection.description) ||
          "";
        if (!Array.isArray(editorData.leftFeatures)) {
          editorData.leftFeatures = Array.isArray(leftSection.features)
            ? leftSection.features
            : [];
        }
        editorData.leftImage =
          (typeof editorData.leftImage === "string" && editorData.leftImage) ||
          (typeof nestedLeftImage.src === "string" && nestedLeftImage.src) ||
          "";
        editorData.leftImageAlt =
          (typeof editorData.leftImageAlt === "string" &&
            editorData.leftImageAlt) ||
          (typeof nestedLeftImage.alt === "string" && nestedLeftImage.alt) ||
          "";
        editorData.formTitle =
          (typeof editorData.formTitle === "string" && editorData.formTitle) ||
          (typeof form.title === "string" && form.title) ||
          "Send Us a Message";
        if (
          form.fields &&
          !Array.isArray(form.fields) &&
          typeof form.fields === "object"
        ) {
          const fields = form.fields as Record<string, unknown>;
          editorData.form = {
            ...form,
            fields: Object.entries(fields).map(([key, value]) => {
              const entry = asRecord(value);
              return {
                name: key,
                label: typeof entry.label === "string" ? entry.label : key,
                placeholder:
                  typeof entry.placeholder === "string" ? entry.placeholder : "",
                type: typeof entry.type === "string" ? entry.type : "text",
                required: Boolean(entry.required),
                icon: typeof entry.icon === "string" ? entry.icon : "",
                options: Array.isArray(entry.options) ? entry.options : [],
              };
            }),
          };
        }
      }

      if (label === "enquiry contact") {
        editorData.contactTitle =
          (typeof editorData.contactTitle === "string" &&
            editorData.contactTitle) ||
          (typeof contactSection.title === "string" && contactSection.title) ||
          "Prefer to talk?";
        editorData.contactPretitle =
          (typeof editorData.contactPretitle === "string" &&
            editorData.contactPretitle) ||
          (typeof contactSection.pretitle === "string" &&
            contactSection.pretitle) ||
          "";
        editorData.contactDesc =
          (typeof editorData.contactDesc === "string" &&
            editorData.contactDesc) ||
          (typeof contactSection.description === "string" &&
            contactSection.description) ||
          "";
        if (!Array.isArray(editorData.contactItems)) {
          editorData.contactItems = Array.isArray(contactSection.items)
            ? contactSection.items
            : [];
        }
      }

      if (label === "enquiry cta") {
        editorData.ctaIcon =
          (typeof editorData.ctaIcon === "string" && editorData.ctaIcon) ||
          (typeof footerBanner.icon === "string" && footerBanner.icon) ||
          "shield-check";
        editorData.ctaText =
          (typeof editorData.ctaText === "string" && editorData.ctaText) ||
          (typeof footerBanner.text === "string" && footerBanner.text) ||
          "";
        editorData.ctaSubtext =
          (typeof editorData.ctaSubtext === "string" && editorData.ctaSubtext) ||
          (typeof footerBanner.subtext === "string" && footerBanner.subtext) ||
          "";
        editorData.ctaButtonLabel =
          (typeof editorData.ctaButtonLabel === "string" &&
            editorData.ctaButtonLabel) ||
          (typeof nestedButton.label === "string" && nestedButton.label) ||
          "Learn More About Us";
        editorData.ctaButtonHref =
          (typeof editorData.ctaButtonHref === "string" &&
            editorData.ctaButtonHref) ||
          (typeof nestedButton.href === "string" && nestedButton.href) ||
          "/about";
        editorData.ctaButtonIcon =
          (typeof editorData.ctaButtonIcon === "string" &&
            editorData.ctaButtonIcon) ||
          (typeof nestedButton.icon === "string" && nestedButton.icon) ||
          "arrow-right";
      }
    }

    if (
      category === "NGO" &&
      (activeSectionType === "Support" || activeSectionType === "SupportPage")
    ) {
      const asRecord = (value: unknown): Record<string, unknown> =>
        value && typeof value === "object" && !Array.isArray(value)
          ? (value as Record<string, unknown>)
          : {};
      const toPlain = (value: unknown) => {
        if (typeof value === "string") return value;
        const rec = asRecord(value);
        return [rec.plainText, rec.highlightedText, rec.line1, rec.highlight]
          .filter(
            (part): part is string =>
              typeof part === "string" && Boolean(part.trim()),
          )
          .join(" ")
          .trim();
      };
      const withIcon = (items: unknown[]) =>
        items.map((item) => {
          if (!item || typeof item !== "object" || Array.isArray(item)) {
            return item;
          }
          const rec = item as Record<string, unknown>;
          const action = asRecord(rec.action);
          const button = asRecord(rec.button);
          const href =
            (typeof button.href === "string" && button.href) ||
            (typeof action.href === "string" && action.href) ||
            (typeof action.url === "string" && action.url) ||
            "";
          const label =
            (typeof button.label === "string" && button.label) ||
            (typeof action.label === "string" && action.label) ||
            "";
          return {
            ...rec,
            icon:
              (typeof rec.icon === "string" && rec.icon) ||
              (typeof rec.iconName === "string" && rec.iconName) ||
              "heart",
            ...(label || href
              ? { button: { label: label || "Learn More", href: href || "#" } }
              : {}),
          };
        });
      const supportLabel =
        subsectionScope?.label.trim().toLowerCase() ?? "";
      const introduction = asRecord(editorData.introduction);
      const keyValues = asRecord(editorData.keyValues);
      const waysToSupport = asRecord(editorData.waysToSupport);
      const impactStats = asRecord(editorData.impactStats);
      const ctaBanner = asRecord(editorData.ctaBanner);
      const bannerImage = asRecord(ctaBanner.bannerImage);
      const primaryAction = asRecord(ctaBanner.primaryAction);
      const secondaryAction = asRecord(ctaBanner.secondaryAction);
      const transparencyBar = asRecord(editorData.transparencyBar);
      const transparencyAction = asRecord(transparencyBar.action);

      if (
        ["", "support intro", "support overview"].includes(supportLabel)
      ) {
        editorData.pretitle =
          (typeof editorData.pretitle === "string" && editorData.pretitle) ||
          (typeof introduction.topBadge === "string" &&
            introduction.topBadge) ||
          "SUPPORT US";
        const currentTitle =
          typeof editorData.title === "string" ? editorData.title.trim() : "";
        editorData.title =
          currentTitle && currentTitle.toLowerCase() !== "support"
            ? currentTitle
            : toPlain(introduction.heading) ||
              "Together, We Can Create a Better Tomorrow";
        editorData.desc =
          (typeof editorData.desc === "string" && editorData.desc) ||
          (typeof editorData.description === "string" &&
            editorData.description) ||
          (typeof introduction.description === "string" &&
            introduction.description) ||
          "";
        const values = Array.isArray(editorData.values)
          ? editorData.values
          : Array.isArray(keyValues.values)
            ? keyValues.values
            : [];
        editorData.values = withIcon(values);
      }

      if (supportLabel === "ways to support") {
        editorData.waysPretitle =
          (typeof editorData.waysPretitle === "string" &&
            editorData.waysPretitle) ||
          (typeof waysToSupport.topBadge === "string" &&
            waysToSupport.topBadge) ||
          "WAYS TO SUPPORT";
        editorData.waysTitle =
          (typeof editorData.waysTitle === "string" &&
            editorData.waysTitle) ||
          (typeof waysToSupport.heading === "string" &&
            waysToSupport.heading) ||
          "Every Action Helps Us Bring Change";
        const cards = Array.isArray(editorData.supportCards)
          ? editorData.supportCards
          : Array.isArray(waysToSupport.supportCards)
            ? waysToSupport.supportCards
            : [];
        editorData.supportCards = withIcon(cards);
      }

      if (supportLabel === "impact stats") {
        editorData.impactPretitle =
          (typeof editorData.impactPretitle === "string" &&
            editorData.impactPretitle) ||
          (typeof impactStats.topBadge === "string" &&
            impactStats.topBadge) ||
          "YOUR SUPPORT, REAL IMPACT";
        editorData.impactTitle =
          (typeof editorData.impactTitle === "string" &&
            editorData.impactTitle) ||
          (typeof impactStats.heading === "string" && impactStats.heading) ||
          "Changing Lives, Building Futures";
        const stats = Array.isArray(editorData.stats)
          ? editorData.stats
          : Array.isArray(impactStats.stats)
            ? impactStats.stats
            : [];
        editorData.stats = withIcon(stats);
        editorData.closingText =
          (typeof editorData.closingText === "string" &&
            editorData.closingText) ||
          (typeof impactStats.closingText === "string" &&
            impactStats.closingText) ||
          "";
      }

      if (supportLabel === "support cta") {
        editorData.ctaPretitle =
          (typeof editorData.ctaPretitle === "string" &&
            editorData.ctaPretitle) ||
          (typeof ctaBanner.topBadge === "string" && ctaBanner.topBadge) ||
          "BE A PART OF THE CHANGE";
        editorData.ctaTitle =
          (typeof editorData.ctaTitle === "string" && editorData.ctaTitle) ||
          toPlain(ctaBanner.heading) ||
          "Your Support Can Change a Life Today";
        editorData.ctaDesc =
          (typeof editorData.ctaDesc === "string" && editorData.ctaDesc) ||
          (typeof ctaBanner.description === "string" &&
            ctaBanner.description) ||
          "";
        editorData.ctaImage =
          (typeof editorData.ctaImage === "string" && editorData.ctaImage) ||
          (typeof bannerImage.src === "string" && bannerImage.src) ||
          "";
        const existingPrimary = asRecord(editorData.ctaPrimaryButton);
        const existingSecondary = asRecord(editorData.ctaSecondaryButton);
        editorData.ctaPrimaryButton = {
          label:
            (typeof existingPrimary.label === "string" &&
              existingPrimary.label) ||
            (typeof primaryAction.label === "string" && primaryAction.label) ||
            "Donate Now",
          href:
            (typeof existingPrimary.href === "string" &&
              existingPrimary.href) ||
            (typeof primaryAction.href === "string" && primaryAction.href) ||
            (typeof primaryAction.url === "string" && primaryAction.url) ||
            "/donate",
        };
        editorData.ctaSecondaryButton = {
          label:
            (typeof existingSecondary.label === "string" &&
              existingSecondary.label) ||
            (typeof secondaryAction.label === "string" &&
              secondaryAction.label) ||
            "Be Member",
          href:
            (typeof existingSecondary.href === "string" &&
              existingSecondary.href) ||
            (typeof secondaryAction.href === "string" &&
              secondaryAction.href) ||
            (typeof secondaryAction.url === "string" &&
              secondaryAction.url) ||
            "/team",
        };
      }

      if (supportLabel === "transparency") {
        editorData.transparencyIcon =
          (typeof editorData.transparencyIcon === "string" &&
            editorData.transparencyIcon) ||
          (typeof transparencyBar.iconName === "string" &&
            transparencyBar.iconName) ||
          "shield-check";
        editorData.transparencyTitle =
          (typeof editorData.transparencyTitle === "string" &&
            editorData.transparencyTitle) ||
          (typeof transparencyBar.title === "string" &&
            transparencyBar.title) ||
          "We are committed to transparency and accountability.";
        editorData.transparencyDesc =
          (typeof editorData.transparencyDesc === "string" &&
            editorData.transparencyDesc) ||
          (typeof transparencyBar.pretitle === "string" &&
            transparencyBar.pretitle) ||
          "";
        const existingButton = asRecord(editorData.transparencyButton);
        editorData.transparencyButton = {
          label:
            (typeof existingButton.label === "string" &&
              existingButton.label) ||
            (typeof transparencyAction.label === "string" &&
              transparencyAction.label) ||
            "Learn More About Us",
          href:
            (typeof existingButton.href === "string" &&
              existingButton.href) ||
            (typeof transparencyAction.href === "string" &&
              transparencyAction.href) ||
            (typeof transparencyAction.url === "string" &&
              transparencyAction.url) ||
            "/about-us",
        };
      }
    }

    return editorData;
  })();
  const popularEventTabItems =
    activeSectionType === "PopularEvents"
      ? (() => {
          const fromTabs = Array.isArray(activeGenericEditorData?.tabs)
            ? activeGenericEditorData.tabs.filter(
                (item): item is string =>
                  typeof item === "string" && Boolean(item.trim()),
              )
            : [];
          if (fromTabs.length) return fromTabs;
          return Array.isArray(activeGenericData?.categories)
            ? activeGenericData.categories.filter(
                (item): item is string =>
                  typeof item === "string" && Boolean(item.trim()),
              )
            : [];
        })()
      : [];
  const [scopedContentFields] = useState<Set<string> | null>(() => {
    if (!subsectionScope) return null;

    if (subsectionScope.fields?.length) {
      return new Set(subsectionScope.fields);
    }

    if (
      activeVariant === "RealEstateServicePage1" &&
      subsectionScope.label.trim().toLowerCase() === "services overview"
    ) {
      return new Set(["sideImage"]);
    }

    if (
      activeVariant === "RealEstateProject1" &&
      subsectionScope.label.trim().toLowerCase() === "project categories"
    ) {
      return new Set(["tabs"]);
    }

    const scopedContent = normalizeScopeContent(subsectionScope.content);
    return new Set(
      Object.entries(activeGenericEditorData ?? {})
        .filter(([, value]) => valueAppearsInSubsection(value, scopedContent))
        .map(([field]) => field),
    );
  });
  const mappedComponentContentFields = getComponentContentFields(
    activeVariant,
    activeSectionType,
    isPageSection,
  );
  const defaultInnerPageFields = Object.keys(
    innerPageContentDefaultsByVariant[activeVariant] ?? {},
  );
  const eventsGalleryContentFields = [
    "pretitle",
    "title",
    "desc",
    "description",
    "images",
    "cta",
  ];
  const eventsGalleryPageContentFields = [
    "title",
    "subtitle",
    "backgroundImage",
    "breadcrumb",
    "textColor",
    "backgroundColor",
    "tabs",
    "cards",
    "noImagesLabel",
  ];
  const eventsAwardsContentFields = [
    "pretitle",
    "title",
    "desc",
    "description",
    "items",
  ];
  const eventsTeamContentFields = [
    "pretitle",
    "title",
    "desc",
    "description",
    "members",
    "joinButton",
  ];
  const eventsTestimonialContentFields = [
    "pretitle",
    "title",
    "desc",
    "description",
    "testimonialItems",
  ];
  const eventsTestimonialCardFields = [
    "initials",
    "name",
    "role",
    "quote",
    "rating",
    "address",
  ];
  const eventsWhyChooseUsCardFields = [
    "image",
    "icon",
    "title",
    "desc",
    "description",
  ];
  const eventsBlogContentFields = [
    "pretitle",
    "title",
    "desc",
    "description",
    "buttonLabel",
    "buttonIcon",
    "blogItems",
  ];
  const eventsBlogPageContentFields = [
    "title",
    "subtitle",
    "backgroundImage",
    "breadcrumb",
    "textColor",
    "backgroundColor",
    "blogItems",
    "buttonLabel",
    "buttonIcon",
  ];
  const eventsBlogDetailsBannerFields = [
    "title",
    "subtitle",
    "backgroundImage",
    "breadcrumb",
    "textColor",
    "backgroundColor",
  ];
  const eventsBlogDetailsArticleFields = [
    "featuredImage",
    "featuredImageAlt",
    "category",
    "label",
    "author",
    "date",
    "readTime",
    "title",
    "description",
    "content",
  ];
  const eventsBlogDetailsRecentFields = ["relatedTitle", "relatedPosts"];
  const eventsBlogDetailsContentFields = [
    ...eventsBlogDetailsBannerFields,
    ...eventsBlogDetailsArticleFields,
    ...eventsBlogDetailsRecentFields,
  ];
  const eventsBlogDetailsArticleCardFields = ["type", "text", "items"];
  const eventsBlogDetailsRecentCardFields = [
    "image",
    "alt",
    "label",
    "title",
    "description",
    "link",
  ];
  const eventsBlogCardFields = [
    "image",
    "alt",
    "label",
    "title",
    "description",
    "date",
    "link",
  ];
  const eventsCareersBannerFields = [
    "title",
    "subtitle",
    "backgroundImage",
    "breadcrumb",
    "textColor",
    "backgroundColor",
  ];
  const eventsCareersOverviewFields = [
    "description",
    "description2",
    "heroImage",
    "heroImageAlt",
    "stats",
  ];
  const eventsCareersRolesFields = [
    "rolesPretitle",
    "rolesTitle",
    "rolesApplyLabel",
    "roles",
  ];
  const eventsCareersQuoteFields = [
    "quote",
    "quoteAuthor",
    "ctaLabel",
    "ctaHref",
  ];
  const eventsCareersPageContentFields = [
    ...eventsCareersBannerFields,
    ...eventsCareersOverviewFields,
    ...eventsCareersRolesFields,
    "applyForm",
    ...eventsCareersQuoteFields,
  ];
  const eventsCareersStatsCardFields = ["value", "label"];
  const eventsCareersRolesCardFields = [
    "title",
    "location",
    "type",
    "description",
  ];
  const eventsCareersApplyBannerFields = [
    "backgroundImage",
    "breadcrumb",
    "textColor",
    "backgroundColor",
  ];
  const eventsCareersApplyFormFields = ["applyForm"];
  const eventsCareersApplyJobFields = [
    "title",
    "department",
    "location",
    "type",
    "experience",
    "postedOn",
    "description",
  ];
  const eventsCareersApplyWhyJoinFields = ["whyJoinUs"];
  const eventsCareersApplyPageContentFields = [
    ...eventsCareersApplyBannerFields,
    ...eventsCareersApplyJobFields,
    ...eventsCareersApplyFormFields,
    ...eventsCareersApplyWhyJoinFields,
  ];
  const eventsCareersApplyWhyJoinCardFields = ["icon", "title", "description"];
  const eventsFaqContentFields = [
    "pretitle",
    "title",
    "desc",
    "description",
    "faqItems",
  ];
  const eventsContactContentFields = [
    "pretitle",
    "title",
    "desc",
    "leftBadge",
    "leftTitle",
    "leftTitleHighlight",
    "leftDesc",
    "features",
    "ctaLabel",
    "ctaHref",
    "form",
  ];
  const eventsContactPageBannerFields = [
    "title",
    "subtitle",
    "backgroundImage",
    "breadcrumb",
    "textColor",
    "backgroundColor",
  ];
  const eventsContactOverviewFields = ["contactItems", "form"];
  const eventsContactMapFields = ["mapEmbedUrl"];
  const eventsContactPageContentFields = [
    ...eventsContactPageBannerFields,
    ...eventsContactOverviewFields,
    ...eventsContactMapFields,
  ];
  const eventsContactPageCardFields = ["icon", "label", "value", "value2"];
  const eventsCaseStudyBannerFields = [
    "title",
    "subtitle",
    "backgroundImage",
    "breadcrumb",
    "textColor",
    "backgroundColor",
  ];
  const eventsCaseStudyOverviewFields = [
    "featuredImage",
    "featuredImageAlt",
    "stats",
    "highlightsTitle",
    "highlights",
  ];
  const eventsCaseStudyProjectFields = [
    "projectTitle",
    "projectDescription",
    "projectPoints",
  ];
  const eventsCaseStudyCtaFields = ["ctaTitle", "ctaLabel", "ctaHref"];
  const eventsCaseStudyPageContentFields = [
    ...eventsCaseStudyBannerFields,
    ...eventsCaseStudyOverviewFields,
    ...eventsCaseStudyProjectFields,
    ...eventsCaseStudyCtaFields,
  ];
  const eventsCaseStudyStatsCardFields = ["value", "label"];
  const eventsCaseStudyHighlightCardFields = ["title", "description"];
  const eventsCaseStudyProjectCardFields = ["title", "description"];
  const eventsSupportBannerFields = [
    "title",
    "subtitle",
    "heroSubtitle",
    "backgroundImage",
    "breadcrumb",
    "textColor",
    "backgroundColor",
  ];
  const eventsSupportOverviewFields = [
    "contactPretitle",
    "contactTitle",
    "contactDescription",
    "contactItems",
    "faqPretitle",
    "faqTitle",
    "faqItems",
  ];
  const eventsSupportPageContentFields = [
    ...eventsSupportBannerFields,
    ...eventsSupportOverviewFields,
  ];
  const eventsSupportContactCardFields = ["icon", "label", "value"];
  const eventsSupportFaqCardFields = ["question", "answer"];
  const eventsLegalBannerFields = [
    "title",
    "subtitle",
    "backgroundImage",
    "breadcrumb",
    "textColor",
    "backgroundColor",
  ];
  const eventsLegalContentFields = ["sections"];
  const eventsLegalPageContentFields = [
    ...eventsLegalBannerFields,
    ...eventsLegalContentFields,
  ];
  const eventsLegalSectionCardFields = ["title", "content"];
  const eventsAboutPageAboutContentFields = [
    "pretitle",
    "description",
    "description1",
    "quote",
    "image",
    "imageAlt",
    "description2",
    "description3",
    "quoteRole",
    "image2",
    "image2Alt",
  ];
  const eventsAboutPageContentFields = [
    "pretitle",
    "title",
    "subtitle",
    "backgroundImage",
    "breadcrumb",
    "textColor",
    "backgroundColor",
    ...eventsAboutPageAboutContentFields.filter(
      (field) => field !== "pretitle",
    ),
    "stats",
    "values",
    "cta",
  ];
  const eventsAboutContentFields = [
    "pretitle",
    "title",
    "subtitle",
    "desc",
    "desc2",
    "sideImage",
    "sideImageTitle",
    "buttons",
    "stats",
  ];
  const ngoBreadcrumbContentFields = [
    "breadcrumbBackgroundType",
    "breadcrumbColorBackgroundType",
    "backgroundImage",
    "breadcrumb",
    "textColor",
    "backgroundColor",
    "breadcrumbGradientColor",
  ];
  const ngoAboutContentFields = [
    "badge",
    "title",
    "desc",
    "buttons",
    "trustBadges",
    "gallery",
    "statistics",
    "background",
  ];
  const ngoMissionContentFields = [
    "badge",
    "title",
    "tabs",
    "imageSection",
  ];
  const ngoWhyChooseUsContentFields = [
    "badge",
    "title",
    "desc",
    "image",
    "imageAlt",
    "imageOverlay",
    "cards",
  ];
  const ngoMissionTabCardFields = visibleCardFieldsByCollection.ngoMissionTabItems;
  const ngoMissionFeatureCardFields =
    visibleCardFieldsByCollection.ngoMissionFeatures;
  const ngoWhyChooseUsCardFields = ["icon", "title", "desc"];
  const ngoServicesContentFields = [
    "pretitle",
    "title",
    "desc",
    "items",
  ];
  const ngoServicesCardFields = [
    "image",
    "icon",
    "title",
    "description",
    "link",
    "label",
  ];
  const ngoServicesCtaContentFields = ["callToAction"];
  const ngoTeamContentFields = ["pretitle", "title", "desc", "members"];
  const ngoTeamCardFields = [
    "image",
    "name",
    "designation",
    "description",
    "socials",
  ];
  const ngoTeamCtaContentFields = ["cta"];
  const ngoTeamDetailProfileFields = [
    "name",
    "role",
    "bio",
    "image",
    "stats",
    "contactInfo",
    "socialLinks",
  ];
  const ngoTeamDetailAboutFields = ["about", "skills"];
  const ngoTeamDetailSkillCardFields = ["skill", "percentage"];
  const ngoTeamDetailExperienceFields = ["experience"];
  const ngoTeamDetailExperienceCardFields = [
    "period",
    "role",
    "organization",
    "description",
  ];
  const ngoTeamDetailAchievementsFields = ["achievements"];
  const ngoTeamDetailAchievementCardFields = ["title", "description"];
  const ngoTeamDetailStatCardFields = ["value", "label"];
  const ngoMediaContentFields = ["sectionTitle", "mediaCards"];
  const ngoMediaCardFields = ["image", "title", "articleUrl"];
  const ngoIndustryContentFields = [
    "pretitle",
    "title",
    "desc",
    "sectionTag",
    "sectors",
  ];
  const ngoIndustryCardFields = ["image", "icon", "title", "description"];
  const ngoIndustryPartnerFields = [
    "partnerTitle",
    "partnerTitleHighlight",
    "partnerDesc",
    "partnerButton",
    "metrics",
  ];
  const ngoIndustryMetricCardFields = ["icon", "value", "label"];
  const ngoBranchesContentFields = ["pretitle", "title", "desc", "stats"];
  const ngoBranchesStatCardFields = ["icon", "value", "label", "subLabel"];
  const ngoBranchesLocationsFields = [
    "locationsLabel",
    "locationsTitle",
    "branches",
    "mapImage",
  ];
  const ngoBranchesLocationCardFields = ["city", "address", "phone"];
  const ngoBranchesCtaFields = [
    "ctaLabel",
    "ctaTitle",
    "ctaDesc",
    "ctaPrimaryButton",
    "ctaSecondaryButton",
    "ctaImage",
  ];
  const ngoBranchesContactFields = ["contactItems"];
  const ngoBranchesContactCardFields = ["icon", "label", "value"];
  const ngoAwardsContentFields = ["pretitle", "title", "desc", "stats"];
  const ngoAwardsStatCardFields = ["icon", "value", "label"];
  const ngoAwardsGridFields = ["awardsLabel", "awardsTitle", "awards"];
  const ngoAwardsCardFields = ["image", "title", "description", "year"];
  const ngoAwardsSupportFields = [
    "supportLabel",
    "supportTitle",
    "supportTitleHighlight",
    "supportDesc",
    "supportButton",
    "supportImage",
  ];
  const ngoAwardsTransparencyFields = [
    "transparencyTitle",
    "transparencyDesc",
    "transparencyButton",
  ];
  const ngoCareersOverviewFields = ["title", "desc", "benefits"];
  const ngoCareersBenefitCardFields = ["icon", "title", "description"];
  const ngoCareersRolesFields = ["rolesTitle", "rolesApplyLabel", "jobs"];
  const ngoCareersJobCardFields = [
    "title",
    "description",
    "location",
    "employmentType",
  ];
  const ngoCareersCtaFields = ["ctaTitle", "ctaDesc", "ctaButton"];
  const ngoCausesContentFields = [
    "pretitle",
    "title",
    "desc",
    "items",
    "exploreButton",
    "showExploreButton",
  ];
  const ngoCtaContentFields = ["title", "desc", "button"];
  const ngoProjectsContentFields = [
    "pretitle",
    "title",
    "desc",
    "items",
    "exploreButton",
    "showExploreButton",
  ];
  const ngoProjectsPageContentFields = [
    "pretitle",
    "title",
    "desc",
    "items",
  ];
  const ngoProjectsCardFields = [
    "image",
    "icon",
    "category",
    "title",
    "description",
    "button",
  ];
  const ngoEventsContentFields = [
    "pretitle",
    "title",
    "desc",
    "events",
    "exploreButton",
    "showExploreButton",
  ];
  const ngoEventsCardFields = [
    "image",
    "title",
    "href",
    "button",
  ];
  const ngoTestimonialContentFields = [
    "pretitle",
    "title",
    "desc",
    "testimonials",
  ];
  const ngoTestimonialsPageFields = [
    "pretitle",
    "title",
    "highlight",
    "desc",
    "testimonials",
  ];
  const ngoTestimonialCardFields = [
    "image",
    "name",
    "designation",
    "rating",
    "message",
  ];
  const ngoBlogContentFields = [
    "pretitle",
    "title",
    "desc",
    "articles",
    "exploreButton",
    "showExploreButton",
  ];
  const ngoBlogCardFields = [
    "image",
    "category",
    "date",
    "title",
    "description",
    "href",
  ];
  const ngoGalleryContentFields = [
    "pretitle",
    "title",
    "desc",
    "categories",
    "images",
  ];
  const ngoGalleryCardFields = ["image", "src", "category"];
  const ngoContactOverviewFields = ["office", "contactItems", "form"];
  const ngoContactFeaturesFields = ["cards"];
  const ngoContactMapFields = ["mapEmbedUrl"];
  const ngoFrenchiseIntroFields = ["pretitle", "title", "desc", "features"];
  const ngoFrenchiseIntroCardFields = ["icon", "title", "description"];
  const ngoFrenchiseFormFields = [
    "leftPretitle",
    "leftTitle",
    "leftDesc",
    "leftPoints",
    "leftImage",
    "leftImageAlt",
    "formTitle",
    "formPretitle",
    "form",
  ];
  const ngoFrenchiseProcessFields = ["processPretitle", "processTitle", "steps"];
  const ngoFrenchiseProcessCardFields = ["icon", "title", "description"];
  const ngoFrenchiseCtaFields = [
    "ctaTitle",
    "ctaPretitle",
    "ctaDesc",
    "ctaPhone",
    "ctaEmail",
    "ctaHours",
    "ctaImage",
    "ctaImageAlt",
  ];
  const ngoEnquiryFormFields = [
    "pretitle",
    "title",
    "desc",
    "leftTitle",
    "leftDesc",
    "leftFeatures",
    "leftImage",
    "leftImageAlt",
    "formTitle",
    "form",
  ];
  const ngoEnquiryFormCardFields = ["icon", "title", "description"];
  const ngoEnquiryContactFields = [
    "contactTitle",
    "contactPretitle",
    "contactDesc",
    "contactItems",
  ];
  const ngoEnquiryContactCardFields = ["icon", "label", "value"];
  const ngoEnquiryCtaFields = [
    "ctaIcon",
    "ctaText",
    "ctaSubtext",
    "ctaButtonLabel",
    "ctaButtonHref",
    "ctaButtonIcon",
  ];
  const ngoContactFeatureCardFields = ["icon", "title", "description"];
  const ngoSupportIntroFields = ["pretitle", "title", "desc", "values"];
  const ngoSupportValueCardFields = ["icon", "title", "description"];
  const ngoSupportWaysFields = ["waysPretitle", "waysTitle", "supportCards"];
  const ngoSupportCardFields = ["icon", "title", "description", "button"];
  const ngoSupportImpactFields = [
    "impactPretitle",
    "impactTitle",
    "stats",
    "closingText",
  ];
  const ngoSupportStatCardFields = ["icon", "value", "label"];
  const ngoSupportCtaFields = [
    "ctaPretitle",
    "ctaTitle",
    "ctaDesc",
    "ctaImage",
    "ctaPrimaryButton",
    "ctaSecondaryButton",
  ];
  const ngoSupportTransparencyFields = [
    "transparencyIcon",
    "transparencyTitle",
    "transparencyDesc",
    "transparencyButton",
  ];
  const ngoFaqContentFields = ["pretitle", "title", "desc", "questions"];
  const ngoFaqCardFields = ["question", "answer"];
  const ngoPartnersContentFields = ["pretitle", "title", "desc", "partnersList"];
  const ngoPartnersCardFields = ["logo", "name", "website"];
  const ngoCsrIntroFields = ["pretitle", "title", "desc", "stats"];
  const ngoCsrIntroCardFields = ["icon", "value", "label"];
  const ngoCsrFocusFields = ["focusPretitle", "focusItems"];
  const ngoCsrFocusCardFields = ["image", "icon", "title", "description"];
  const ngoCsrImpactFields = [
    "impactPretitle",
    "impactDesc",
    "impactButton",
    "pillars",
  ];
  const ngoCsrImpactCardFields = ["icon", "title", "description"];
  const ngoCsrProjectsFields = ["projectsPretitle", "csrProjectItems"];
  const ngoCsrProjectsCardFields = ["image", "title", "description"];
  const ngoCsrCtaFields = ["ctaTitle", "ctaDesc", "ctaButton"];
  const ngoCsrValuesFields = ["coreValueItems"];
  const ngoCsrValuesCardFields = ["icon", "title", "description"];
  const ngoBrochureIntroFields = ["pretitle", "title", "desc", "features"];
  const ngoBrochureIntroCardFields = ["icon", "title", "description"];
  const ngoBrochureListFields = ["listPretitle", "listTitle", "brochures"];
  const ngoBrochureCardFields = [
    "image",
    "name",
    "description",
    "downloadlabel",
    "downloadUrl",
  ];
  const ngoBrochureCtaFields = [
    "ctaPretitle",
    "ctaTitle",
    "ctaDesc",
    "ctaPrimaryButton",
    "ctaSecondaryButton",
    "ctaStats",
  ];
  const ngoBrochureCtaCardFields = ["icon", "value", "label"];
  const ngoCaseStudyContentFields = [
    "pretitle",
    "title",
    "desc",
    "items",
  ];
  const ngoCaseStudyCtaFields = ["ctaTitle", "ctaDesc", "ctaButton"];
  const ngoCaseDetailsArticleFields = [
    "pageTitle",
    "primaryTitle",
    "primaryImage",
    "primaryImageAlt",
    "primaryParagraphs",
    "postedOn",
    "secondaryTitle",
    "secondaryParagraphs",
    "popularPostsTitle",
    "popularPosts",
  ];
  const ngoCaseDetailsSidebarFields = [
    "popularPostsTitle",
    "popularPosts",
  ];
  const ngoCaseDetailsSidebarCardFields = [
    "image",
    "date",
    "category",
    "title",
    "slug",
  ];
  const ngoFooterRecentNewsCardFields = [
    "image",
    "date",
    "title",
    "href",
  ];
  const eventsAboutCardFields = ["value", "label"];
  const ngoAboutCardFields = [
    "label",
    "href",
    "variant",
    "icon",
    "text",
    "desc",
    "value",
  ];
  const ngoCausesCardFields = [
    "image",
    "icon",
    "category",
    "title",
    "titleLink",
    "description",
    "button",
  ];
  const eventsAboutPageCardFields = [
    "icon",
    "value",
    "label",
    "title",
    "desc",
    "description",
  ];
  const eventsOurStoryContentFields = [
    "title",
    "subtitle",
    "backgroundImage",
    "breadcrumb",
    "textColor",
    "backgroundColor",
    "description",
    "description2",
    "quote",
    "image",
    "imageAlt",
    "button",
    "stats",
    "milestonesPretitle",
    "milestonesTitle",
    "milestonesDesc",
    "milestones",
  ];
  const eventsOurStoryCardFields = [
    "year",
    "value",
    "label",
    "title",
    "description",
  ];
  const eventsVisionPageContentFields = [
    "title",
    "subtitle",
    "backgroundImage",
    "breadcrumb",
    "textColor",
    "backgroundColor",
    "vision",
    "mission",
    "coreBeliefsPretitle",
    "coreBeliefsTitle",
    "coreBeliefs",
  ];
  const eventsVisionPageCardFields = [
    "icon",
    "title",
    "description",
    "text",
  ];
  const eventsTeamsBannerFields = [
    "title",
    "subtitle",
    "backgroundImage",
    "breadcrumb",
    "textColor",
    "backgroundColor",
  ];
  const eventsTeamsTabsFields = ["departments"];
  const eventsTeamsMembersContentFields = ["members"];
  const eventsTeamsJoinCtaFields = [
    "joinTitle",
    "joinDescription",
    "joinButton1",
  ];
  const eventsTeamsPageContentFields = [
    ...eventsTeamsBannerFields,
    ...eventsTeamsTabsFields,
    ...eventsTeamsMembersContentFields,
    ...eventsTeamsJoinCtaFields,
  ];
  const eventsTeamsDepartmentCardFields = ["label", "value"];
  const eventsTeamsMemberCardFields = [
    "image",
    "name",
    "role",
    "department",
    "bio",
    "social",
  ];
  const eventsTeamHomeMemberCardFields = [
    "image",
    "name",
    "role",
    "department",
    "bio",
    "social",
  ];
  const eventsTeamDetailContentFields = [
    "title",
    "subtitle",
    "backgroundImage",
    "breadcrumb",
    "textColor",
    "backgroundColor",
    "image",
    "name",
    "role",
    "department",
    "email",
    "phone",
    "bio",
    "longBio",
    "skills",
    "social",
  ];
  const eventsTeamDetailCardFields = ["title", "description"];
  const eventsAwardsPageContentFields = [
    "title",
    "subtitle",
    "backgroundImage",
    "breadcrumb",
    "textColor",
    "backgroundColor",
    "featuredAward",
    "awardsPretitle",
    "awardsTitle",
    "awards",
    "stats",
  ];
  const eventsAwardsPageCardFields = [
    "year",
    "title",
    "body",
    "category",
    "icon",
    "description",
    "value",
    "label",
  ];
  const eventsGlobalPresenceContentFields = [
    "title",
    "subtitle",
    "backgroundImage",
    "breadcrumb",
    "textColor",
    "backgroundColor",
    "description",
    "stats",
    "worldImage",
    "worldImageAlt",
  ];
  const eventsGlobalPresenceCardFields = ["value", "label"];
  const eventsEventPageContentFields = [
    "title",
    "subtitle",
    "backgroundImage",
    "breadcrumb",
    "textColor",
    "backgroundColor",
    "items",
    "ctaPretitle",
    "ctaTitle",
    "ctaDescription",
    "ctaButton",
    "ctaItems",
  ];
  const eventsEventPageCardFields = [
    "badge",
    "title",
    "description",
    "image",
    "imageAlt",
    "href",
  ];
  const eventsEventDetailContentFields = [
    "title",
    "subtitle",
    "backgroundImage",
    "breadcrumb",
    "textColor",
    "backgroundColor",
    "heroImage",
    "introDescription",
    "features",
    "detailCtaTitle",
    "detailCtaDescription",
    "detailCtaButton",
  ];
  const eventsEventDetailCardFields = ["icon", "title", "description", "desc"];
  const eventsPopularEventsContentFields = [
    "pretitle",
    "title",
    "desc",
    "description",
    "tabs",
    "buttonLabel",
    "buttonIcon",
    "events",
  ];
  const subsectionLabel = subsectionScope?.label.trim().toLowerCase() ?? "";
  const isBreadcrumbSubsection =
    subsectionLabel === "breadcrumb" || subsectionLabel === "page banner";
  const resolvedComponentContentFields =
    category === "Events" &&
    activeSectionType === "Gallery" &&
    activeVariant === "EventsGalleryPage1"
      ? eventsGalleryPageContentFields
      : category === "Events" && activeSectionType === "Gallery"
        ? eventsGalleryContentFields
        : category === "Events" && activeSectionType === "Awards"
        ? eventsAwardsContentFields
        : category === "Events" && activeSectionType === "Team"
          ? eventsTeamContentFields
          : category === "Events" && activeSectionType === "Testimonial"
            ? eventsTestimonialContentFields
            : category === "Events" &&
                activeSectionType === "Blog" &&
                activeVariant === "EventsBlogPage1"
              ? eventsBlogPageContentFields
              : category === "Events" && activeSectionType === "Blog"
                ? eventsBlogContentFields
                : category === "Events" && activeSectionType === "BlogDetails"
                  ? subsectionScope?.label.trim().toLowerCase() ===
                      "recent posts"
                    ? eventsBlogDetailsRecentFields
                    : subsectionScope?.label.trim().toLowerCase() ===
                        "article content"
                      ? eventsBlogDetailsArticleFields
                      : isBreadcrumbSubsection
                        ? eventsBlogDetailsBannerFields
                        : eventsBlogDetailsContentFields
                : category === "Events" && activeSectionType === "Careers"
                  ? subsectionScope?.label.trim().toLowerCase() ===
                      "open roles"
                    ? eventsCareersRolesFields
                    : subsectionScope?.label.trim().toLowerCase() ===
                        "careers overview"
                      ? eventsCareersOverviewFields
                      : subsectionScope?.label.trim().toLowerCase() ===
                          "culture quote"
                        ? eventsCareersQuoteFields
                        : isBreadcrumbSubsection
                          ? eventsCareersBannerFields
                          : eventsCareersPageContentFields
                : category === "Events" && activeSectionType === "CareersApply"
                  ? subsectionScope?.label.trim().toLowerCase() ===
                      "application form"
                    ? eventsCareersApplyFormFields
                    : subsectionScope?.label.trim().toLowerCase() ===
                        "job details"
                      ? eventsCareersApplyJobFields
                      : subsectionScope?.label.trim().toLowerCase() ===
                          "why join us"
                        ? eventsCareersApplyWhyJoinFields
                        : isBreadcrumbSubsection
                          ? eventsCareersApplyBannerFields
                          : eventsCareersApplyPageContentFields
                : category === "Events" && activeSectionType === "FAQ"
                ? eventsFaqContentFields
                : category === "Events" && activeSectionType === "Contact"
                  ? activeVariant === "EventsContactPage1"
                    ? subsectionScope?.label.trim().toLowerCase() ===
                        "contact overview"
                      ? eventsContactOverviewFields
                      : subsectionScope?.label.trim().toLowerCase() === "map"
                        ? eventsContactMapFields
                        : isBreadcrumbSubsection
                          ? eventsContactPageBannerFields
                          : eventsContactPageContentFields
                    : eventsContactContentFields
                  : category === "Events" && activeSectionType === "CaseStudy"
                    ? subsectionScope?.label.trim().toLowerCase() ===
                        "case study overview"
                      ? eventsCaseStudyOverviewFields
                      : subsectionScope?.label.trim().toLowerCase() ===
                          "project details"
                        ? eventsCaseStudyProjectFields
                        : subsectionScope?.label.trim().toLowerCase() ===
                            "case study cta"
                          ? eventsCaseStudyCtaFields
                          : isBreadcrumbSubsection
                            ? eventsCaseStudyBannerFields
                            : eventsCaseStudyPageContentFields
                  : category === "Events" && activeSectionType === "Support"
                    ? subsectionScope?.label.trim().toLowerCase() ===
                        "support overview"
                      ? eventsSupportOverviewFields
                      : isBreadcrumbSubsection
                        ? eventsSupportBannerFields
                        : eventsSupportPageContentFields
                  : category === "Events" &&
                      (activeSectionType === "PrivacyPolicy" ||
                        activeSectionType === "TermsCondition")
                    ? (() => {
                        const label =
                          subsectionScope?.label.trim().toLowerCase() ?? "";
                        if (
                          label === "privacy policy content" ||
                          label === "terms content"
                        ) {
                          return eventsLegalContentFields;
                        }
                        if (label === "page banner" || label === "breadcrumb") {
                          return eventsLegalBannerFields;
                        }
                        return eventsLegalPageContentFields;
                      })()
                  : category === "Events" &&
                      (activeSectionType === "AboutPage" ||
                        activeSectionType === "AboutUsPage")
                    ? subsectionScope?.label.trim().toLowerCase() ===
                      "about content"
                      ? eventsAboutPageAboutContentFields
                      : eventsAboutPageContentFields
                    : category === "Events" && activeSectionType === "About"
                      ? eventsAboutContentFields
                    : category === "NGO" && isBreadcrumbSubsection
                      ? ngoBreadcrumbContentFields
                    : category === "NGO" &&
                        (activeSectionType === "AboutPage" ||
                          activeSectionType === "AboutUsPage") &&
                        (subsectionScope?.label.trim().toLowerCase() ===
                          "mission" ||
                          subsectionScope?.label.trim().toLowerCase() ===
                            "mission vision")
                      ? ngoMissionContentFields
                    : category === "NGO" &&
                        (activeSectionType === "AboutPage" ||
                          activeSectionType === "AboutUsPage") &&
                        subsectionScope?.label.trim().toLowerCase() ===
                          "why choose us"
                      ? ngoWhyChooseUsContentFields
                    : category === "NGO" &&
                        (activeSectionType === "AboutPage" ||
                          activeSectionType === "AboutUsPage") &&
                        subsectionScope?.label.trim().toLowerCase() ===
                          "about content"
                      ? ngoAboutContentFields
                    : category === "NGO" && activeSectionType === "About"
                      ? ngoAboutContentFields
                    : category === "NGO" &&
                        (activeSectionType === "Services" ||
                          activeSectionType === "ServicesPage") &&
                        (subsectionScope?.label.trim().toLowerCase() ===
                          "services cta")
                      ? ngoServicesCtaContentFields
                    : category === "NGO" &&
                        (activeSectionType === "Services" ||
                          activeSectionType === "ServicesPage") &&
                        ["services", "services content"].includes(
                          subsectionScope?.label.trim().toLowerCase() ?? "",
                        )
                      ? ngoServicesContentFields
                    : category === "NGO" &&
                        (activeSectionType === "Teams" ||
                          activeSectionType === "TeamsPage") &&
                        (subsectionScope?.label.trim().toLowerCase() ===
                          "team cta")
                      ? ngoTeamCtaContentFields
                    : category === "NGO" &&
                        (activeSectionType === "Teams" ||
                          activeSectionType === "TeamsPage") &&
                        ["team", "team members"].includes(
                          subsectionScope?.label.trim().toLowerCase() ?? "",
                        )
                      ? ngoTeamContentFields
                    : category === "NGO" &&
                        activeSectionType === "TeamDetail" &&
                        subsectionScope?.label.trim().toLowerCase() ===
                          "team profile"
                      ? ngoTeamDetailProfileFields
                    : category === "NGO" &&
                        activeSectionType === "TeamDetail" &&
                        subsectionScope?.label.trim().toLowerCase() ===
                          "about & skills"
                      ? ngoTeamDetailAboutFields
                    : category === "NGO" &&
                        activeSectionType === "TeamDetail" &&
                        subsectionScope?.label.trim().toLowerCase() ===
                          "experience"
                      ? ngoTeamDetailExperienceFields
                    : category === "NGO" &&
                        activeSectionType === "TeamDetail" &&
                        subsectionScope?.label.trim().toLowerCase() ===
                          "achievements"
                      ? ngoTeamDetailAchievementsFields
                    : category === "NGO" &&
                        activeSectionType === "Media" &&
                        ["media", "media content"].includes(
                          subsectionScope?.label.trim().toLowerCase() ?? "",
                        )
                      ? ngoMediaContentFields
                    : category === "NGO" &&
                        activeSectionType === "Industry" &&
                        subsectionScope?.label.trim().toLowerCase() ===
                          "industry partner"
                      ? ngoIndustryPartnerFields
                    : category === "NGO" &&
                        activeSectionType === "Industry" &&
                        [
                          "",
                          "industry",
                          "industry content",
                        ].includes(
                          subsectionScope?.label.trim().toLowerCase() ?? "",
                        )
                      ? ngoIndustryContentFields
                    : category === "NGO" &&
                        activeSectionType === "Branches" &&
                        subsectionScope?.label.trim().toLowerCase() ===
                          "branch locations"
                      ? ngoBranchesLocationsFields
                    : category === "NGO" &&
                        activeSectionType === "Branches" &&
                        subsectionScope?.label.trim().toLowerCase() ===
                          "branches cta"
                      ? ngoBranchesCtaFields
                    : category === "NGO" &&
                        activeSectionType === "Branches" &&
                        subsectionScope?.label.trim().toLowerCase() ===
                          "branches contact"
                      ? ngoBranchesContactFields
                    : category === "NGO" &&
                        activeSectionType === "Branches" &&
                        ["", "branches", "branches content"].includes(
                          subsectionScope?.label.trim().toLowerCase() ?? "",
                        )
                      ? ngoBranchesContentFields
                    : category === "NGO" &&
                        activeSectionType === "AwardsPage" &&
                        subsectionScope?.label.trim().toLowerCase() ===
                          "awards grid"
                      ? ngoAwardsGridFields
                    : category === "NGO" &&
                        activeSectionType === "AwardsPage" &&
                        subsectionScope?.label.trim().toLowerCase() ===
                          "awards support"
                      ? ngoAwardsSupportFields
                    : category === "NGO" &&
                        activeSectionType === "AwardsPage" &&
                        subsectionScope?.label.trim().toLowerCase() ===
                          "awards transparency"
                      ? ngoAwardsTransparencyFields
                    : category === "NGO" &&
                        activeSectionType === "AwardsPage" &&
                        ["", "awards", "awards content"].includes(
                          subsectionScope?.label.trim().toLowerCase() ?? "",
                        )
                      ? ngoAwardsContentFields
                    : category === "NGO" &&
                        activeSectionType === "Careers" &&
                        subsectionScope?.label.trim().toLowerCase() ===
                          "open roles"
                      ? ngoCareersRolesFields
                    : category === "NGO" &&
                        activeSectionType === "Careers" &&
                        subsectionScope?.label.trim().toLowerCase() ===
                          "careers cta"
                      ? ngoCareersCtaFields
                    : category === "NGO" &&
                        activeSectionType === "Careers" &&
                        ["", "careers overview"].includes(
                          subsectionScope?.label.trim().toLowerCase() ?? "",
                        )
                      ? ngoCareersOverviewFields
                    : category === "NGO" && activeSectionType === "Causes"
                      ? ngoCausesContentFields
                    : category === "NGO" &&
                        activeSectionType === "ProjectsPage" &&
                        ["", "projects", "projects grid", "projects content"].includes(
                          subsectionScope?.label.trim().toLowerCase() ?? "",
                        )
                      ? ngoProjectsPageContentFields
                    : category === "NGO" && activeSectionType === "Projects"
                      ? ngoProjectsContentFields
                    : category === "NGO" && activeSectionType === "Events"
                      ? ngoEventsContentFields
                    : category === "NGO" &&
                        activeSectionType === "EventsPage" &&
                        ["events", "events list", "events content"].includes(
                          subsectionScope?.label.trim().toLowerCase() ?? "",
                        )
                      ? ngoEventsContentFields
                    : category === "NGO" && activeSectionType === "Testimonial"
                      ? ngoTestimonialContentFields
                    : category === "NGO" &&
                        isNGOTestimonialsPageSection &&
                        [
                          "",
                          "testimonial intro",
                          "testimonial content",
                          "testimonials",
                          "testimonials content",
                        ].includes(
                          subsectionScope?.label.trim().toLowerCase() ?? "",
                        )
                      ? ngoTestimonialsPageFields
                    : category === "NGO" &&
                        activeSectionType === "Blog" &&
                        (!isPageSection ||
                          ["blog", "blog posts", "blog content"].includes(
                            subsectionScope?.label.trim().toLowerCase() ?? "",
                          ))
                      ? ngoBlogContentFields
                    : category === "NGO" &&
                        activeSectionType === "Gallery" &&
                        ["", "gallery", "gallery grid", "gallery content"].includes(
                          subsectionScope?.label.trim().toLowerCase() ?? "",
                        )
                      ? ngoGalleryContentFields
                    : category === "NGO" &&
                        activeSectionType === "Contact" &&
                        ["contact overview", "contact"].includes(
                          subsectionScope?.label.trim().toLowerCase() ?? "",
                        )
                      ? ngoContactOverviewFields
                    : category === "NGO" &&
                        activeSectionType === "Contact" &&
                        subsectionScope?.label.trim().toLowerCase() ===
                          "contact features"
                      ? ngoContactFeaturesFields
                    : category === "NGO" &&
                        activeSectionType === "Contact" &&
                        subsectionScope?.label.trim().toLowerCase() === "map"
                      ? ngoContactMapFields
                    : category === "NGO" &&
                        isNGOFrenchiseSection &&
                        ["", "franchise intro"].includes(
                          subsectionScope?.label.trim().toLowerCase() ?? "",
                        )
                      ? ngoFrenchiseIntroFields
                    : category === "NGO" &&
                        isNGOFrenchiseSection &&
                        subsectionScope?.label.trim().toLowerCase() ===
                          "franchise form"
                      ? ngoFrenchiseFormFields
                    : category === "NGO" &&
                        isNGOFrenchiseSection &&
                        subsectionScope?.label.trim().toLowerCase() ===
                          "franchise process"
                      ? ngoFrenchiseProcessFields
                    : category === "NGO" &&
                        isNGOFrenchiseSection &&
                        subsectionScope?.label.trim().toLowerCase() ===
                          "franchise cta"
                      ? ngoFrenchiseCtaFields
                    : category === "NGO" &&
                        isNGOEnquirySection &&
                        [
                          "",
                          "enquiry intro",
                          "enquiry form",
                        ].includes(
                          subsectionScope?.label.trim().toLowerCase() ?? "",
                        )
                      ? ngoEnquiryFormFields
                    : category === "NGO" &&
                        isNGOEnquirySection &&
                        subsectionScope?.label.trim().toLowerCase() ===
                          "enquiry contact"
                      ? ngoEnquiryContactFields
                    : category === "NGO" &&
                        isNGOEnquirySection &&
                        subsectionScope?.label.trim().toLowerCase() ===
                          "enquiry cta"
                      ? ngoEnquiryCtaFields
                    : category === "NGO" &&
                        isNGOSupportSection &&
                        ["", "support intro", "support overview"].includes(
                          subsectionScope?.label.trim().toLowerCase() ?? "",
                        )
                      ? ngoSupportIntroFields
                    : category === "NGO" &&
                        isNGOSupportSection &&
                        subsectionScope?.label.trim().toLowerCase() ===
                          "ways to support"
                      ? ngoSupportWaysFields
                    : category === "NGO" &&
                        isNGOSupportSection &&
                        subsectionScope?.label.trim().toLowerCase() ===
                          "impact stats"
                      ? ngoSupportImpactFields
                    : category === "NGO" &&
                        isNGOSupportSection &&
                        subsectionScope?.label.trim().toLowerCase() ===
                          "support cta"
                      ? ngoSupportCtaFields
                    : category === "NGO" &&
                        isNGOSupportSection &&
                        subsectionScope?.label.trim().toLowerCase() ===
                          "transparency"
                      ? ngoSupportTransparencyFields
                    : category === "NGO" &&
                        isNGOFAQSection &&
                        ["", "faq", "faqs", "faq content"].includes(
                          subsectionScope?.label.trim().toLowerCase() ?? "",
                        )
                      ? ngoFaqContentFields
                    : category === "NGO" &&
                        isNGOPartnersSection &&
                        ["", "partners", "partners content", "partners list"].includes(
                          subsectionScope?.label.trim().toLowerCase() ?? "",
                        )
                      ? ngoPartnersContentFields
                    : category === "NGO" &&
                        isNGOCsrSection &&
                        ["", "csr intro", "csr overview"].includes(
                          subsectionScope?.label.trim().toLowerCase() ?? "",
                        )
                      ? ngoCsrIntroFields
                    : category === "NGO" &&
                        isNGOCsrSection &&
                        subsectionScope?.label.trim().toLowerCase() ===
                          "focus areas"
                      ? ngoCsrFocusFields
                    : category === "NGO" &&
                        isNGOCsrSection &&
                        subsectionScope?.label.trim().toLowerCase() ===
                          "our impact"
                      ? ngoCsrImpactFields
                    : category === "NGO" &&
                        isNGOCsrSection &&
                        subsectionScope?.label.trim().toLowerCase() ===
                          "csr projects"
                      ? ngoCsrProjectsFields
                    : category === "NGO" &&
                        isNGOCsrSection &&
                        subsectionScope?.label.trim().toLowerCase() === "csr cta"
                      ? ngoCsrCtaFields
                    : category === "NGO" &&
                        isNGOCsrSection &&
                        subsectionScope?.label.trim().toLowerCase() ===
                          "core values"
                      ? ngoCsrValuesFields
                    : category === "NGO" &&
                        isNGOBrochureSection &&
                        ["", "brochure intro"].includes(
                          subsectionScope?.label.trim().toLowerCase() ?? "",
                        )
                      ? ngoBrochureIntroFields
                    : category === "NGO" &&
                        isNGOBrochureSection &&
                        ["brochures", "brochure list"].includes(
                          subsectionScope?.label.trim().toLowerCase() ?? "",
                        )
                      ? ngoBrochureListFields
                    : category === "NGO" &&
                        isNGOBrochureSection &&
                        ["together we can", "brochure cta"].includes(
                          subsectionScope?.label.trim().toLowerCase() ?? "",
                        )
                      ? ngoBrochureCtaFields
                    : category === "NGO" &&
                        isNGOCaseStudySection &&
                        [
                          "",
                          "case study overview",
                          "case studies",
                        ].includes(
                          subsectionScope?.label.trim().toLowerCase() ?? "",
                        )
                      ? ngoCaseStudyContentFields
                    : category === "NGO" &&
                        isNGOCaseStudySection &&
                        subsectionScope?.label.trim().toLowerCase() ===
                          "case study cta"
                      ? ngoCaseStudyCtaFields
                    : category === "NGO" &&
                        isNGOCaseDetailsSection &&
                        !isBreadcrumbSubsection
                      ? ngoCaseDetailsArticleFields
                    : category === "NGO" && activeSectionType === "Cta"
                      ? ngoCtaContentFields
                    : category === "Events" && activeSectionType === "OurStory"
                      ? eventsOurStoryContentFields
                      : category === "Events" &&
                          activeSectionType === "VisionMission"
                        ? eventsVisionPageContentFields
                        : category === "Events" && activeSectionType === "Teams"
                          ? subsectionScope?.label.trim().toLowerCase() ===
                              "team members"
                            ? eventsTeamsMembersContentFields
                            : subsectionScope?.label.trim().toLowerCase() ===
                                "join cta"
                              ? eventsTeamsJoinCtaFields
                              : isBreadcrumbSubsection
                                ? eventsTeamsBannerFields
                                : eventsTeamsPageContentFields
                          : category === "Events" &&
                              activeSectionType === "TeamDetail"
                            ? eventsTeamDetailContentFields
                          : category === "Events" &&
                              activeSectionType === "AwardsPage"
                            ? eventsAwardsPageContentFields
                            : category === "Events" &&
                                activeSectionType === "GlobalPresence"
                              ? eventsGlobalPresenceContentFields
                              : category === "Events" &&
                                  activeSectionType === "EventCategories"
                                ? eventsEventPageContentFields
                                : category === "Events" &&
                                    activeSectionType === "EventDetail"
                                  ? eventsEventDetailContentFields
                                  : category === "Events" &&
                                      activeSectionType === "PopularEvents"
                                    ? eventsPopularEventsContentFields
      : isPageSection &&
          (mappedComponentContentFields || defaultInnerPageFields.length)
        ? Array.from(
          new Set([
            ...(mappedComponentContentFields ??
              Object.keys(activeGenericData ?? {})),
            ...defaultInnerPageFields,
          ]),
        )
        : mappedComponentContentFields;
  const activeComponentContentFields =
    category === "Events" &&
    resolvedComponentContentFields &&
    (resolvedComponentContentFields.includes("breadcrumb") ||
      isBreadcrumbSubsection)
      ? Array.from(
          new Set([
            ...resolvedComponentContentFields,
            "textColor",
            "backgroundColor",
            "breadcrumbBackgroundType",
            "breadcrumbColorBackgroundType",
            "breadcrumbGradientColor",
          ]),
        )
      : category === "NGO" &&
          isBreadcrumbSubsection &&
          resolvedComponentContentFields
        ? Array.from(
            new Set([
              ...resolvedComponentContentFields,
              "textColor",
              "backgroundColor",
              "breadcrumbBackgroundType",
              "breadcrumbColorBackgroundType",
              "breadcrumbGradientColor",
            ]),
          )
        : resolvedComponentContentFields;
  const eventsScopedCardFields = (() => {
    if (category !== "Events") return undefined;
    const subsectionLabel = subsectionScope?.label.trim().toLowerCase() ?? "";

    if (isEventsHomeContact) return ["icon", "title", "description"];
    if (
      activeSectionType === "Contact" &&
      subsectionLabel === "contact overview"
    ) {
      return ["icon", "label", "value", "value2"];
    }
    if (activeSectionType === "OurStory") {
      if (subsectionLabel === "milestones") {
        return ["year", "title", "description"];
      }
      if (subsectionLabel === "stats") return ["value", "label"];
    }
    if (activeSectionType === "VisionMission") {
      if (subsectionLabel === "core beliefs") {
        return ["icon", "title", "description"];
      }
      if (subsectionLabel === "vision" || subsectionLabel === "mission") {
        return ["icon", "text"];
      }
    }
    if (activeSectionType === "AwardsPage") {
      if (subsectionLabel === "trophy wall") {
        return ["year", "title", "body", "category", "icon", "description"];
      }
      if (subsectionLabel === "stats") return ["value", "label"];
    }
    if (activeSectionType === "EventCategories") {
      if (subsectionLabel === "event categories") {
        return ["badge", "title", "description", "image", "imageAlt", "href"];
      }
      if (subsectionLabel === "cta") return ["value", "label"];
    }
    if (
      activeSectionType === "Gallery" &&
      (subsectionLabel === "gallery grid" ||
        activeVariant === "EventsGalleryPage1")
    ) {
      return ["image", "imageAlt", "badge"];
    }
    if (activeSectionType === "Careers") {
      if (subsectionLabel === "open roles") {
        return ["title", "location", "type", "description"];
      }
      if (subsectionLabel === "careers overview") {
        return ["value", "label"];
      }
    }
    if (
      activeSectionType === "CareersApply" &&
      subsectionLabel === "why join us"
    ) {
      return ["icon", "title", "description"];
    }
    if (activeSectionType === "Teams") {
      if (subsectionLabel === "team members") {
        return eventsTeamsMemberCardFields;
      }
    }
    if (activeSectionType === "Team") {
      return eventsTeamHomeMemberCardFields;
    }
    if (activeSectionType === "TeamDetail") {
      return eventsTeamDetailCardFields;
    }
    return undefined;
  })();
  const activeCardFields =
    eventsScopedCardFields ??
    subsectionScope?.cardFields ??
    (category === "Events" && activeSectionType === "About"
      ? eventsAboutCardFields
      : category === "NGO" &&
          (activeSectionType === "AboutPage" ||
            activeSectionType === "AboutUsPage") &&
          (subsectionScope?.label.trim().toLowerCase() === "mission" ||
            subsectionScope?.label.trim().toLowerCase() === "mission vision")
        ? undefined
      : category === "NGO" &&
          (activeSectionType === "AboutPage" ||
            activeSectionType === "AboutUsPage") &&
          subsectionScope?.label.trim().toLowerCase() === "why choose us"
        ? ngoWhyChooseUsCardFields
      : category === "NGO" &&
          (activeSectionType === "Services" ||
            activeSectionType === "ServicesPage") &&
          ["services", "services content"].includes(
            subsectionScope?.label.trim().toLowerCase() ?? "",
          )
        ? ngoServicesCardFields
      : category === "NGO" &&
          (activeSectionType === "Teams" ||
            activeSectionType === "TeamsPage") &&
          ["team", "team members"].includes(
            subsectionScope?.label.trim().toLowerCase() ?? "",
          )
        ? ngoTeamCardFields
      : category === "NGO" &&
          activeSectionType === "TeamDetail" &&
          subsectionScope?.label.trim().toLowerCase() === "team profile"
        ? ngoTeamDetailStatCardFields
      : category === "NGO" &&
          activeSectionType === "TeamDetail" &&
          subsectionScope?.label.trim().toLowerCase() === "about & skills"
        ? ngoTeamDetailSkillCardFields
      : category === "NGO" &&
          activeSectionType === "TeamDetail" &&
          subsectionScope?.label.trim().toLowerCase() === "experience"
        ? ngoTeamDetailExperienceCardFields
      : category === "NGO" &&
          activeSectionType === "TeamDetail" &&
          subsectionScope?.label.trim().toLowerCase() === "achievements"
        ? ngoTeamDetailAchievementCardFields
      : category === "NGO" &&
          activeSectionType === "Media" &&
          ["media", "media content"].includes(
            subsectionScope?.label.trim().toLowerCase() ?? "",
          )
        ? ngoMediaCardFields
      : category === "NGO" &&
          activeSectionType === "Industry" &&
          subsectionScope?.label.trim().toLowerCase() === "industry partner"
        ? ngoIndustryMetricCardFields
      : category === "NGO" &&
          activeSectionType === "Industry" &&
          ["", "industry", "industry content"].includes(
            subsectionScope?.label.trim().toLowerCase() ?? "",
          )
        ? ngoIndustryCardFields
      : category === "NGO" &&
          activeSectionType === "Branches" &&
          subsectionScope?.label.trim().toLowerCase() === "branch locations"
        ? ngoBranchesLocationCardFields
      : category === "NGO" &&
          activeSectionType === "Branches" &&
          subsectionScope?.label.trim().toLowerCase() === "branches contact"
        ? ngoBranchesContactCardFields
      : category === "NGO" &&
          activeSectionType === "Branches" &&
          ["", "branches", "branches content"].includes(
            subsectionScope?.label.trim().toLowerCase() ?? "",
          )
        ? ngoBranchesStatCardFields
      : category === "NGO" &&
          activeSectionType === "AwardsPage" &&
          subsectionScope?.label.trim().toLowerCase() === "awards grid"
        ? ngoAwardsCardFields
      : category === "NGO" &&
          activeSectionType === "AwardsPage" &&
          ["", "awards", "awards content"].includes(
            subsectionScope?.label.trim().toLowerCase() ?? "",
          )
        ? ngoAwardsStatCardFields
      : category === "NGO" &&
          activeSectionType === "Careers" &&
          subsectionScope?.label.trim().toLowerCase() === "open roles"
        ? ngoCareersJobCardFields
      : category === "NGO" &&
          activeSectionType === "Careers" &&
          ["", "careers overview"].includes(
            subsectionScope?.label.trim().toLowerCase() ?? "",
          )
        ? ngoCareersBenefitCardFields
      : category === "NGO" && activeSectionType === "About"
        ? undefined
      : category === "NGO" &&
          (activeSectionType === "AboutPage" ||
            activeSectionType === "AboutUsPage") &&
          subsectionScope?.label.trim().toLowerCase() === "about content"
        ? ngoAboutCardFields
      : category === "NGO" && activeSectionType === "Causes"
        ? ngoCausesCardFields
      : category === "NGO" &&
          (activeSectionType === "Projects" ||
            (activeSectionType === "ProjectsPage" &&
              ["projects", "projects grid", "projects content"].includes(
                subsectionScope?.label.trim().toLowerCase() ?? "",
              )))
        ? ngoProjectsCardFields
      : category === "NGO" &&
          (activeSectionType === "Events" ||
            (activeSectionType === "EventsPage" &&
              ["events", "events list", "events content"].includes(
                subsectionScope?.label.trim().toLowerCase() ?? "",
              )))
        ? ngoEventsCardFields
      : category === "NGO" &&
          (activeSectionType === "Testimonial" ||
            (activeSectionType === "TestimonialsPage" &&
              [
                "",
                "testimonial intro",
                "testimonial content",
                "testimonials",
                "testimonials content",
              ].includes(
                subsectionScope?.label.trim().toLowerCase() ?? "",
              )))
        ? ngoTestimonialCardFields
      : category === "NGO" &&
          activeSectionType === "Blog" &&
          (!isPageSection ||
            ["blog", "blog posts", "blog content"].includes(
              subsectionScope?.label.trim().toLowerCase() ?? "",
            ))
        ? ngoBlogCardFields
      : category === "NGO" &&
          activeSectionType === "Gallery" &&
          ["", "gallery", "gallery grid", "gallery content"].includes(
            subsectionScope?.label.trim().toLowerCase() ?? "",
          )
        ? ngoGalleryCardFields
      : category === "NGO" &&
          activeSectionType === "Contact" &&
          subsectionScope?.label.trim().toLowerCase() === "contact features"
        ? ngoContactFeatureCardFields
      : category === "NGO" &&
          isNGOFrenchiseSection &&
          ["", "franchise intro"].includes(
            subsectionScope?.label.trim().toLowerCase() ?? "",
          )
        ? ngoFrenchiseIntroCardFields
      : category === "NGO" &&
          isNGOFrenchiseSection &&
          subsectionScope?.label.trim().toLowerCase() === "franchise process"
        ? ngoFrenchiseProcessCardFields
      : category === "NGO" &&
          isNGOEnquirySection &&
          ["enquiry form", "enquiry intro"].includes(
            subsectionScope?.label.trim().toLowerCase() ?? "",
          )
        ? ngoEnquiryFormCardFields
      : category === "NGO" &&
          isNGOEnquirySection &&
          subsectionScope?.label.trim().toLowerCase() === "enquiry contact"
        ? ngoEnquiryContactCardFields
      : category === "NGO" &&
          isNGOSupportSection &&
          ["", "support intro", "support overview"].includes(
            subsectionScope?.label.trim().toLowerCase() ?? "",
          )
        ? ngoSupportValueCardFields
      : category === "NGO" &&
          isNGOSupportSection &&
          subsectionScope?.label.trim().toLowerCase() === "ways to support"
        ? ngoSupportCardFields
      : category === "NGO" &&
          isNGOSupportSection &&
          subsectionScope?.label.trim().toLowerCase() === "impact stats"
        ? ngoSupportStatCardFields
      : category === "NGO" &&
          isNGOFAQSection &&
          ["", "faq", "faqs", "faq content"].includes(
            subsectionScope?.label.trim().toLowerCase() ?? "",
          )
        ? ngoFaqCardFields
      : category === "NGO" &&
          isNGOPartnersSection &&
          ["", "partners", "partners content", "partners list"].includes(
            subsectionScope?.label.trim().toLowerCase() ?? "",
          )
        ? ngoPartnersCardFields
      : category === "NGO" &&
          isNGOCsrSection &&
          ["", "csr intro", "csr overview"].includes(
            subsectionScope?.label.trim().toLowerCase() ?? "",
          )
        ? ngoCsrIntroCardFields
      : category === "NGO" &&
          isNGOCsrSection &&
          subsectionScope?.label.trim().toLowerCase() === "focus areas"
        ? ngoCsrFocusCardFields
      : category === "NGO" &&
          isNGOCsrSection &&
          subsectionScope?.label.trim().toLowerCase() === "our impact"
        ? ngoCsrImpactCardFields
      : category === "NGO" &&
          isNGOCsrSection &&
          subsectionScope?.label.trim().toLowerCase() === "csr projects"
        ? ngoCsrProjectsCardFields
      : category === "NGO" &&
          isNGOCsrSection &&
          subsectionScope?.label.trim().toLowerCase() === "core values"
        ? ngoCsrValuesCardFields
      : category === "NGO" &&
          isNGOBrochureSection &&
          ["", "brochure intro"].includes(
            subsectionScope?.label.trim().toLowerCase() ?? "",
          )
        ? ngoBrochureIntroCardFields
      : category === "NGO" &&
          isNGOBrochureSection &&
          ["brochures", "brochure list"].includes(
            subsectionScope?.label.trim().toLowerCase() ?? "",
          )
        ? ngoBrochureCardFields
      : category === "NGO" &&
          isNGOBrochureSection &&
          ["together we can", "brochure cta"].includes(
            subsectionScope?.label.trim().toLowerCase() ?? "",
          )
        ? ngoBrochureCtaCardFields
      : category === "NGO" &&
          isNGOCaseStudySection &&
          [
            "",
            "case study overview",
            "case studies",
          ].includes(subsectionScope?.label.trim().toLowerCase() ?? "")
        ? ngoCausesCardFields
      : category === "NGO" &&
          isNGOCaseDetailsSection &&
          !isBreadcrumbSubsection
        ? ngoCaseDetailsSidebarCardFields
      : category === "NGO" && activeSectionType === "Footer"
        ? ngoFooterRecentNewsCardFields
      : category === "Events" && activeSectionType === "Testimonial"
      ? eventsTestimonialCardFields
      : category === "Events" && activeSectionType === "WhyChooseUs"
        ? eventsWhyChooseUsCardFields
      : category === "Events" && activeSectionType === "Blog"
        ? eventsBlogCardFields
        : category === "Events" &&
            (activeSectionType === "AboutPage" ||
              activeSectionType === "AboutUsPage")
          ? eventsAboutPageCardFields
          : category === "Events" && activeSectionType === "OurStory"
            ? subsectionScope?.label.trim().toLowerCase() === "milestones"
              ? ["year", "title", "description"]
              : subsectionScope?.label.trim().toLowerCase() === "stats"
                ? ["value", "label"]
                : eventsOurStoryCardFields
            : category === "Events" && activeSectionType === "VisionMission"
              ? subsectionScope?.label.trim().toLowerCase() === "core beliefs"
                ? ["icon", "title", "description"]
                : ["icon", "text"]
              : category === "Events" && activeSectionType === "Teams"
                ? subsectionScope?.label.trim().toLowerCase() === "team members"
                  ? eventsTeamsMemberCardFields
                  : undefined
                : category === "Events" && activeSectionType === "Team"
                  ? eventsTeamHomeMemberCardFields
                : category === "Events" && activeSectionType === "TeamDetail"
                  ? eventsTeamDetailCardFields
                : category === "Events" && activeSectionType === "AwardsPage"
                  ? subsectionScope?.label.trim().toLowerCase() ===
                      "trophy wall"
                    ? [
                        "year",
                        "title",
                        "body",
                        "category",
                        "icon",
                        "description",
                      ]
                    : subsectionScope?.label.trim().toLowerCase() === "stats"
                      ? ["value", "label"]
                      : eventsAwardsPageCardFields
                  : category === "Events" &&
                      activeSectionType === "GlobalPresence"
                    ? eventsGlobalPresenceCardFields
                    : category === "Events" &&
                        activeSectionType === "EventCategories"
                      ? subsectionScope?.label.trim().toLowerCase() ===
                          "event categories"
                        ? [
                            "badge",
                            "title",
                            "description",
                            "image",
                            "imageAlt",
                            "href",
                          ]
                        : subsectionScope?.label.trim().toLowerCase() === "cta"
                          ? ["value", "label"]
                          : eventsEventPageCardFields
                      : category === "Events" &&
                          activeSectionType === "EventDetail"
                        ? eventsEventDetailCardFields
                        : category === "Events" &&
                            activeSectionType === "BlogDetails"
                          ? subsectionScope?.label.trim().toLowerCase() ===
                              "recent posts"
                            ? eventsBlogDetailsRecentCardFields
                            : subsectionScope?.label.trim().toLowerCase() ===
                                "article content"
                              ? eventsBlogDetailsArticleCardFields
                              : [
                                  ...eventsBlogDetailsArticleCardFields,
                                  ...eventsBlogDetailsRecentCardFields,
                                ]
                        : category === "Events" &&
                            activeSectionType === "Careers"
                          ? subsectionScope?.label.trim().toLowerCase() ===
                              "open roles"
                            ? eventsCareersRolesCardFields
                            : subsectionScope?.label.trim().toLowerCase() ===
                                "careers overview"
                              ? eventsCareersStatsCardFields
                              : undefined
                        : category === "Events" &&
                            activeSectionType === "CareersApply"
                          ? subsectionScope?.label.trim().toLowerCase() ===
                              "why join us"
                            ? eventsCareersApplyWhyJoinCardFields
                            : undefined
        : isEventsHomeContact
          ? ["icon", "title", "description"]
        : category === "Events" &&
            activeSectionType === "Contact" &&
            activeVariant === "EventsContactPage1"
                          ? subsectionScope?.label.trim().toLowerCase() !==
                              "contact overview"
                            ? undefined
                            : eventsContactPageCardFields
                        : category === "Events" &&
                            activeSectionType === "CaseStudy"
                          ? subsectionScope?.label.trim().toLowerCase() ===
                              "case study overview"
                            ? [
                                ...eventsCaseStudyStatsCardFields,
                                ...eventsCaseStudyHighlightCardFields,
                              ]
                            : subsectionScope?.label.trim().toLowerCase() ===
                                "project details"
                              ? eventsCaseStudyProjectCardFields
                              : [
                                  ...eventsCaseStudyStatsCardFields,
                                  ...eventsCaseStudyHighlightCardFields,
                                  ...eventsCaseStudyProjectCardFields,
                                ]
                        : category === "Events" &&
                            activeSectionType === "Support"
                          ? [
                              ...eventsSupportContactCardFields,
                              ...eventsSupportFaqCardFields,
                            ]
                        : category === "Events" &&
                            (activeSectionType === "PrivacyPolicy" ||
                              activeSectionType === "TermsCondition")
                          ? eventsLegalSectionCardFields
            : undefined);
  const isEventsBreadcrumbEditor =
    category === "Events" && isBreadcrumbSubsection;
  const isNGOBreadcrumbEditor =
    category === "NGO" && isBreadcrumbSubsection;
  const isBreadcrumbEditor =
    isEventsBreadcrumbEditor || isNGOBreadcrumbEditor;
  const breadcrumbDefaultSolid =
    category === "NGO" ? "#120a1a" : "#111827";
  const breadcrumbDefaultGradient =
    category === "NGO" ? "#ff541b" : "#d61b58";
  const breadcrumbBackgroundType =
    activeGenericEditorData?.breadcrumbBackgroundType === "color"
      ? "color"
      : "image";
  const breadcrumbColorBackgroundType =
    activeGenericEditorData?.breadcrumbColorBackgroundType === "gradient"
      ? "gradient"
      : "solid";
  const breadcrumbSolidColor =
    activeGenericEditorData?.backgroundColor || breadcrumbDefaultSolid;
  const breadcrumbGradientColor =
    activeGenericEditorData?.breadcrumbGradientColor ||
    breadcrumbDefaultGradient;
  const breadcrumbTextColor =
    activeGenericEditorData?.textColor || "#ffffff";
  const ngoBreadcrumbBanner =
    activeGenericEditorData?.banner &&
    typeof activeGenericEditorData.banner === "object" &&
    !Array.isArray(activeGenericEditorData.banner)
      ? (activeGenericEditorData.banner as Record<string, unknown>)
      : {};
  const ngoBreadcrumbTitle =
    typeof ngoBreadcrumbBanner.breadcrumbCurrent === "string"
      ? ngoBreadcrumbBanner.breadcrumbCurrent
      : typeof activeGenericEditorData?.title === "string"
        ? activeGenericEditorData.title
        : "";
  const activeCareersApplyForm = resolveEventsCareersApplyForm(
    activeGenericEditorData?.applyForm as SectionData["applyForm"],
  );
  const isContentFieldVisible = (field: string) => {
    const allowEventsBreadcrumb =
      category === "Events" && field === "breadcrumb" && isPageSection;
    const allowNGOBreadcrumb =
      isNGOBreadcrumbEditor && field === "breadcrumb";

    if (
      isBreadcrumbEditor &&
      eventsBreadcrumbManagedFields.has(field)
    ) {
      return false;
    }

    if (
      isNGOBreadcrumbEditor &&
      (field === "title" ||
        field === "subtitle" ||
        field === "desc" ||
        field === "description" ||
        field === "banner")
    ) {
      return false;
    }

    if (
      (nonVisualContentFields.has(field) &&
        !allowEventsBreadcrumb &&
        !allowNGOBreadcrumb) ||
      field === "boxesPerRow" ||
      field === "boxLayoutByField" ||
      field === "hiddenSubsections" ||
      field === "subsectionOrder" ||
      field === "type" ||
      field === "icon" ||
      field === "hideExploreControls"
    ) {
      return false;
    }

    if (
      category === "NGO" &&
      activeSectionType === "Gallery" &&
      (field === "videos" ||
        field === "banner" ||
        field === "backgroundImage" ||
        field === "badge" ||
        field === "description")
    ) {
      return false;
    }

    if (
      category === "NGO" &&
      (activeSectionType === "FAQ" || activeSectionType === "FAQPage") &&
      (field === "badge" ||
        field === "description" ||
        field === "banner" ||
        field === "backgroundImage" ||
        field === "image" ||
        field === "faqs" ||
        field === "faqItems" ||
        field === "items")
    ) {
      return false;
    }

    if (
      category === "NGO" &&
      (activeSectionType === "Partners" || activeSectionType === "PartnersPage") &&
      (field === "badge" ||
        field === "description" ||
        field === "banner" ||
        field === "backgroundImage" ||
        field === "partners" ||
        field === "cards")
    ) {
      return false;
    }

    if (
      category === "NGO" &&
      (activeSectionType === "CSR" || activeSectionType === "CSRPage") &&
      (field === "header" ||
        field === "focusAreas" ||
        field === "ourImpact" ||
        field === "csrProjects" ||
        field === "bannerCta" ||
        field === "coreValues" ||
        field === "banner" ||
        (!isNGOBreadcrumbEditor && field === "backgroundImage") ||
        (!isNGOBreadcrumbEditor && field === "breadcrumb"))
    ) {
      return false;
    }

    if (
      category === "NGO" &&
      activeSectionType === "TestimonialsPage" &&
      (field === "badge" ||
        field === "description" ||
        field === "banner" ||
        (!isNGOBreadcrumbEditor && field === "backgroundImage") ||
        (!isNGOBreadcrumbEditor && field === "breadcrumb"))
    ) {
      return false;
    }

    if (
      category === "NGO" &&
      (activeSectionType === "Brochure" || activeSectionType === "BrochurePage") &&
      (field === "header" ||
        field === "sectionTitle" ||
        field === "ctaSection" ||
        field === "heading" ||
        field === "banner" ||
        (!isNGOBreadcrumbEditor && field === "backgroundImage") ||
        (!isNGOBreadcrumbEditor && field === "breadcrumb"))
    ) {
      return false;
    }

    if (
      category === "NGO" &&
      activeSectionType === "CaseStudy" &&
      (field === "badge" ||
        field === "cta" ||
        field === "heading" ||
        field === "titleLine1" ||
        field === "titleLine2" ||
        field === "highlight" ||
        field === "description" ||
        field === "banner" ||
        field === "mainContent" ||
        field === "sidebar" ||
        field === "pageTitle" ||
        (!isNGOBreadcrumbEditor && field === "backgroundImage") ||
        (!isNGOBreadcrumbEditor && field === "breadcrumb"))
    ) {
      return false;
    }

    if (
      category === "NGO" &&
      (activeSectionType === "CaseDetails" ||
        activeSectionType === "CaseDetailsPage") &&
      (field === "mainContent" ||
        field === "sidebar" ||
        field === "banner" ||
        field === "searchPlaceholder" ||
        (!isNGOBreadcrumbEditor && field === "backgroundImage") ||
        (!isNGOBreadcrumbEditor && field === "breadcrumb") ||
        (!isNGOBreadcrumbEditor && field === "title"))
    ) {
      return false;
    }

    if (
      category === "NGO" &&
      (activeSectionType === "Contact" || activeSectionType === "ContactPage") &&
      (field === "title" ||
        field === "badge" ||
        field === "description" ||
        field === "banner" ||
        field === "backgroundImage" ||
        field === "map" ||
        field === "features")
    ) {
      return false;
    }

    if (
      category === "NGO" &&
      isNGOFrenchiseSection &&
      (field === "header" ||
        field === "leftSection" ||
        field === "processSection" ||
        field === "contactBanner" ||
        field === "heading" ||
        field === "banner" ||
        (!isNGOBreadcrumbEditor && field === "backgroundImage") ||
        (!isNGOBreadcrumbEditor && field === "breadcrumb"))
    ) {
      return false;
    }

    if (
      category === "NGO" &&
      isNGOEnquirySection &&
      (field === "header" ||
        field === "leftSection" ||
        field === "contactSection" ||
        field === "footerBanner" ||
        field === "heading" ||
        field === "leftPretitle" ||
        field === "formPretitle" ||
        field === "banner" ||
        (!isNGOBreadcrumbEditor && field === "backgroundImage") ||
        (!isNGOBreadcrumbEditor && field === "breadcrumb"))
    ) {
      return false;
    }

    if (
      category === "NGO" &&
      (activeSectionType === "Support" || activeSectionType === "SupportPage") &&
      (field === "introduction" ||
        field === "keyValues" ||
        field === "waysToSupport" ||
        field === "impactStats" ||
        field === "ctaBanner" ||
        field === "transparencyBar" ||
        field === "hero" ||
        field === "banner" ||
        field === "backgroundImage" ||
        field === "breadcrumb")
    ) {
      return false;
    }

    if (
      category === "NGO" &&
      activeSectionType === "ProjectsPage" &&
      (field === "showExploreButton" || field === "exploreButton")
    ) {
      return false;
    }

    if (
      category === "NGO" &&
      activeSectionType === "Industry" &&
      (field === "header" ||
        field === "partnerBanner" ||
        field === "industries" ||
        field === "banner" ||
        field === "backgroundImage" ||
        field === "titleHighlight")
    ) {
      return false;
    }

    if (
      category === "NGO" &&
      activeSectionType === "Branches" &&
      (field === "header" ||
        field === "locationsSection" ||
        field === "ctaBanner" ||
        field === "contactBar" ||
        field === "banner" ||
        field === "backgroundImage")
    ) {
      return false;
    }

    if (
      category === "NGO" &&
      activeSectionType === "AwardsPage" &&
      (field === "header" ||
        field === "awardsSection" ||
        field === "supportBanner" ||
        field === "transparencyBanner" ||
        field === "banner" ||
        field === "backgroundImage")
    ) {
      return false;
    }

    if (
      category === "NGO" &&
      activeSectionType === "Careers" &&
      (field === "whyWorkWithUs" ||
        field === "heading" ||
        field === "badge" ||
        field === "roles" ||
        field === "cta" ||
        field === "banner" ||
        field === "backgroundImage" ||
        field === "description")
    ) {
      return false;
    }

    if (
      category === "Events" &&
      activeVariant === "EventsGalleryPage1" &&
      (field === "images" ||
        field === "cta" ||
        field === "pretitle" ||
        field === "desc" ||
        field === "description")
    ) {
      return false;
    }

    if (
      subsectionScope &&
      !scopedContentFields?.has(field) &&
      !(
        showEventsCareersFormTab &&
        activeTab === EVENTS_CAREERS_FORM_TAB
      )
    ) {
      return false;
    }

    if (
      activeSectionType === "CitiesWeServe" ||
      activeSectionType === "PopularEvents" ||
      activeVariant === "RealEstateProject1"
    ) {
      if (activeTab === "Tabs") return field === "tabs";
      if (field === "categories") return false;
      if (field === "tabs" && activeSectionType !== "PopularEvents") {
        return false;
      }
    }

    if (
      activeSectionType === "PopularEvents" &&
      [
        "aboutTitle",
        "highlightsTitle",
        "summaryTitle",
        "dateLabel",
        "timeLabel",
        "locationLabel",
        "seatsLabel",
        "priceLabel",
        "organizerLabel",
        "bookButtonLabel",
        "bookButtonHref",
      ].includes(field)
    ) {
      return false;
    }

    if (
      activeSectionType === "Featured" &&
      ((field === "title" && activeGenericData?.sectionTitle != null) ||
        (field === "desc" && activeGenericData?.description != null))
    ) {
      return false;
    }

    if (
      activeSectionType === "BlogDetail" &&
      field === "excerpt" &&
      typeof activeGenericData?.body === "string" &&
      activeGenericData.body.trim()
    ) {
      return false;
    }

    if (activeSectionType === "CareerPage" && !subsectionScope) {
      const isFormField = careerPageFormContentFields.has(field);

      if (activeTab === "CareerPage Form" && !isFormField) return false;
      if (activeTab === "CareerPage Content" && isFormField) return false;
    }

    if (showEventsCareersFormTab) {
      const isCareerFormField = eventsCareersFormContentFields.has(field);

      if (activeTab === EVENTS_CAREERS_FORM_TAB && !isCareerFormField) {
        return false;
      }

      if (
        activeTab !== EVENTS_CAREERS_FORM_TAB &&
        isCareerFormField
      ) {
        return false;
      }
    }

    if (showEventsTeamTabsTab) {
      if (activeTab === "Tabs") return field === "departments";
      if (field === "departments") return false;
    }

    if (hasScopedContentAndFormTabs) {
      const isFormField = scopedFormFields.includes(field);

      if (activeTab === "Form" && !isFormField) return false;
      if (activeTab === scopedContentTab && isFormField) return false;
    }

    if (isEventsHomeContact) {
      if (activeTab === "Form") return field === "form";
      if (activeTab.endsWith("Content") && field === "form") return false;
    }

    if (
      showEventsCareersFormTab &&
      activeTab === EVENTS_CAREERS_FORM_TAB &&
      eventsCareersFormContentFields.has(field)
    ) {
      return true;
    }

    return (
      !activeComponentContentFields ||
      activeComponentContentFields.includes(field)
    );
  };
  const ngoGalleryCategorySelectOptions = (
    Array.isArray(activeGenericEditorData?.categories)
      ? activeGenericEditorData.categories
      : []
  )
    .flatMap((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return [];
      const record = item as Record<string, unknown>;
      const value = typeof record.value === "string" ? record.value.trim() : "";
      const optionLabel =
        typeof record.label === "string" && record.label.trim()
          ? record.label.trim()
          : value;
      if (!value || value === "all") return [];
      return [{ value, label: optionLabel }];
    });
  const eventsGalleryTabSelectOptions = (
    Array.isArray(activeGenericEditorData?.tabs)
      ? activeGenericEditorData.tabs
      : Array.isArray(activeGenericData?.tabs)
        ? activeGenericData.tabs
        : []
  ).flatMap((item) => {
    if (typeof item !== "string" || !item.trim()) return [];
    return [{ value: item, label: item }];
  });
  const eventsTeamDepartmentSelectOptions = (
    Array.isArray(activeGenericEditorData?.departments)
      ? activeGenericEditorData.departments
      : Array.isArray(activeGenericData?.departments)
        ? activeGenericData.departments
        : []
  ).flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const record = item as Record<string, unknown>;
    const value = typeof record.value === "string" ? record.value.trim() : "";
    const optionLabel =
      typeof record.label === "string" && record.label.trim()
        ? record.label.trim()
        : value;
    if (!value || value === "all") return [];
    return [{ value, label: optionLabel }];
  });
  const galleryCategorySelectOptions =
    category === "Events" && activeSectionType === "Gallery"
      ? eventsGalleryTabSelectOptions
      : ngoGalleryCategorySelectOptions;
  const activeCategorySelectOptions =
    category === "Events" &&
    (activeSectionType === "Teams" || activeSectionType === "Team")
      ? eventsTeamDepartmentSelectOptions
      : galleryCategorySelectOptions;
  const visibleGenericContentEntries = Object.entries(
  activeGenericEditorData ?? {},
)
  .map(([field, value]) => {
    const storedValue =
      activeGenericData?.[field as keyof SectionData];

    // IMPORTANT:
    // Collections must always use actual saved section data,
    // never defaults / subsection fieldValues.
    if (Array.isArray(storedValue)) {
      if (
        category === "NGO" &&
        activeSectionType === "Industry" &&
        (field === "sectors" || field === "metrics") &&
        Array.isArray(value)
      ) {
        return [field, value] as const;
      }
      if (
        category === "NGO" &&
        activeSectionType === "Branches" &&
        (field === "stats" ||
          field === "branches" ||
          field === "contactItems") &&
        Array.isArray(value)
      ) {
        return [field, value] as const;
      }
      if (
        category === "NGO" &&
        activeSectionType === "AwardsPage" &&
        (field === "stats" || field === "awards") &&
        Array.isArray(value)
      ) {
        return [field, value] as const;
      }
      if (
        category === "NGO" &&
        activeSectionType === "Careers" &&
        (field === "benefits" || field === "jobs") &&
        Array.isArray(value)
      ) {
        return [field, value] as const;
      }
      if (
        category === "NGO" &&
        (activeSectionType === "Support" || activeSectionType === "SupportPage") &&
        (field === "values" ||
          field === "supportCards" ||
          field === "stats") &&
        Array.isArray(value)
      ) {
        return [field, value] as const;
      }
      if (
        category === "NGO" &&
        (activeSectionType === "FAQ" || activeSectionType === "FAQPage") &&
        field === "questions" &&
        Array.isArray(value)
      ) {
        return [field, value] as const;
      }
      if (
        category === "NGO" &&
        (activeSectionType === "Partners" || activeSectionType === "PartnersPage") &&
        field === "partnersList" &&
        Array.isArray(value)
      ) {
        return [field, value] as const;
      }
      if (
        category === "NGO" &&
        (activeSectionType === "CSR" || activeSectionType === "CSRPage") &&
        (field === "stats" ||
          field === "focusItems" ||
          field === "pillars" ||
          field === "csrProjectItems" ||
          field === "coreValueItems") &&
        Array.isArray(value)
      ) {
        return [field, value] as const;
      }
      if (
        category === "NGO" &&
        activeSectionType === "TestimonialsPage" &&
        field === "testimonials" &&
        Array.isArray(value)
      ) {
        return [field, value] as const;
      }
      if (
        category === "NGO" &&
        (activeSectionType === "Brochure" || activeSectionType === "BrochurePage") &&
        (field === "features" ||
          field === "brochures" ||
          field === "ctaStats") &&
        Array.isArray(value)
      ) {
        return [field, value] as const;
      }
      if (
        category === "NGO" &&
        activeSectionType === "CaseStudy" &&
        field === "items" &&
        Array.isArray(value)
      ) {
        return [field, value] as const;
      }
      if (
        category === "NGO" &&
        (activeSectionType === "CaseDetails" ||
          activeSectionType === "CaseDetailsPage") &&
        (field === "popularPosts" ||
          field === "primaryParagraphs" ||
          field === "secondaryParagraphs") &&
        Array.isArray(value)
      ) {
        return [field, value] as const;
      }
      if (
        category === "NGO" &&
        isNGOFrenchiseSection &&
        (field === "features" ||
          field === "leftPoints" ||
          field === "steps") &&
        Array.isArray(value)
      ) {
        return [field, value] as const;
      }
      if (
        category === "NGO" &&
        isNGOEnquirySection &&
        (field === "leftFeatures" || field === "contactItems") &&
        Array.isArray(value)
      ) {
        return [field, value] as const;
      }
      if (
        category === "Events" &&
        activeSectionType === "Contact" &&
        isPageSection &&
        field === "contactItems"
      ) {
        return [
          field,
          storedValue.map((item) => {
            if (!item || typeof item !== "object" || Array.isArray(item)) {
              return item;
            }
            const record = item as Record<string, unknown>;
            if (typeof record.value2 === "string") {
              const firstLine = String(record.value ?? "").split("\n")[0] ?? "";
              return {
                ...record,
                value: firstLine,
                value2: record.value2,
              };
            }
            const lines = String(record.value ?? "").split("\n");
            return {
              ...record,
              value: lines[0] ?? "",
              value2: lines.slice(1).join("\n"),
            };
          }),
        ] as const;
      }
      return [field, storedValue] as const;
    }

    return [field, value] as const;
  })
    .filter(([field]) =>
      activeSectionType === "PopularEvents" && field === "tabs"
        ? false
        : showEventsTeamTabsTab && field === "departments"
          ? false
          : isContentFieldVisible(field),
    )
    .sort(([leftField, leftValue], [rightField, rightValue]) => {
      if (
        (category === "NGO" || isEventsHomeContact) &&
        activeComponentContentFields?.length
      ) {
        const leftIndex = activeComponentContentFields.indexOf(leftField);
        const rightIndex = activeComponentContentFields.indexOf(rightField);
        const leftOrder =
          leftIndex >= 0 ? leftIndex : activeComponentContentFields.length;
        const rightOrder =
          rightIndex >= 0 ? rightIndex : activeComponentContentFields.length;
        return leftOrder - rightOrder;
      }

      const getGroup = (field: string, value: unknown) => {
        const headingIndex = headingContentFieldOrder.indexOf(field);
        if (headingIndex >= 0) return headingIndex;
        if (field === "tabs" || field === "departments") return 50;
        // Contact overview: details first, then form (form is object so would otherwise sort above arrays).
        if (field === "contactItems") return 90;
        if (field === "form") return 110;
        if (Array.isArray(value)) return 200;
        return 100;
      };
      const groupDifference =
        getGroup(leftField, leftValue) - getGroup(rightField, rightValue);

      if (groupDifference !== 0) return groupDifference;
      const fieldOrderSource =
        subsectionScope?.fields?.length
          ? subsectionScope.fields
          : activeComponentContentFields;
      if (!fieldOrderSource) return 0;

      const leftIndex = fieldOrderSource.indexOf(leftField);
      const rightIndex = fieldOrderSource.indexOf(rightField);
      const leftOrder =
        leftIndex >= 0 ? leftIndex : fieldOrderSource.length;
      const rightOrder =
        rightIndex >= 0 ? rightIndex : fieldOrderSource.length;

      return leftOrder - rightOrder;
    })
    .map(([field, value]) => [
      field,
      activeSectionType === "Features" &&
        field === "features" &&
        Array.isArray(value)
        ? value.slice(0, MAX_FEATURE_CARDS)
        : activeSectionType === "Highlight" && field === "categories" && Array.isArray(value)
          ? value.slice(0, 3)
          : activeSectionType === "CareerPage" &&
            field === "jobs" &&
            Array.isArray(value)
            ? value.map((item) =>
              item && typeof item === "object" && !Array.isArray(item)
                ? Object.fromEntries(
                  Object.entries(item).filter(([jobField]) =>
                    careerJobContentFields.has(jobField),
                  ),
                )
                : item,
            )
            : activeSectionType === "CareerPage" &&
              field === "benefits" &&
              Array.isArray(value)
              ? value.map((item) =>
                item && typeof item === "object" && !Array.isArray(item)
                  ? Object.fromEntries(
                    Object.entries(item).filter(([benefitField]) =>
                      careerBenefitContentFields.has(benefitField),
                    ),
                  )
                  : item,
              )
              : activeSectionType === "CareerPage" &&
                field === "formFields" &&
                Array.isArray(value)
                ? value.map((item) => {
                  if (!item || typeof item !== "object" || Array.isArray(item)) {
                    return item;
                  }

                  const formField = item as Record<string, unknown>;
                  return {
                    label: typeof formField.label === "string" ? formField.label : "",
                    placeholder:
                      typeof formField.placeholder === "string"
                        ? formField.placeholder
                        : "",
                  };
                })
                : isPropertyCatalogSection(activeSectionType) &&
                  field === "listings" &&
                  Array.isArray(value)
                  ? value
                    .filter((item) => {
                      if (!item || typeof item !== "object" || Array.isArray(item)) {
                        return false;
                      }

                      const categoryValue = (item as Record<string, unknown>).category;
                      const itemCategory =
                        typeof categoryValue === "string"
                          ? categoryValue.toLowerCase()
                          : "";

                      return activeSectionType === "Rent"
                        ? itemCategory.includes("rent")
                        : itemCategory.includes("sale");
                    })
                    .map((item) => {
                      const listing = item as Record<string, unknown>;
                      const visibleListing = Object.fromEntries(
                        Object.entries(item as Record<string, unknown>).filter(
                          ([listingField]) =>
                            propertyListingContentFields.has(listingField),
                        ),
                      );

                      if (!("href" in visibleListing)) {
                        const slug = typeof listing.slug === "string" ? listing.slug : "";
                        visibleListing.href = slug ? `/properties/${slug}` : "";
                      }

                      return visibleListing;
                    })
                  : activeSectionType === "Featured" && field === "listings" && Array.isArray(value)
                    ? value.map((item) => {
                      if (!item || typeof item !== "object" || Array.isArray(item)) {
                        return item;
                      }

                      const listing = item as Record<string, unknown>;
                      const visibleListing = Object.fromEntries(
                        Object.entries(listing).filter(([listingField]) =>
                          featuredListingContentFields.has(listingField) &&
                          !(listingField === "desc" && listing.description != null),
                        ),
                      );

                      if (!("href" in visibleListing)) {
                        const slug = typeof listing.slug === "string" ? listing.slug : "";
                        visibleListing.href = slug ? `/properties/${slug}` : "";
                      }

                      return visibleListing;
                    })
                    : activeSectionType === "LatestProjects" &&
                      field === "projectItems" &&
                      Array.isArray(value)
                      ? value.map((item) => {
                        if (!item || typeof item !== "object" || Array.isArray(item)) {
                          return item;
                        }

                        return Object.fromEntries(
                          Object.entries(item).filter(
                            ([projectField]) => latestProjectCardFields.has(projectField),
                          ),
                        );
                      })
                      : activeSectionType === "CitiesWeServe" &&
                        field === "cities" &&
                        Array.isArray(value)
                        ? value
                          .filter((item) => {
                            if (
                              !item ||
                              typeof item !== "object" ||
                              Array.isArray(item)
                            ) {
                              return false;
                            }

                            if (activePortfolioFilter === "All") {
                              return true;
                            }

                            const city = item as Record<string, unknown>;

                            const itemCategory =
                              typeof city.category === "string"
                                ? city.category
                                : typeof city.listingsLabel === "string"
                                  ? city.listingsLabel
                                  : "";

                            return (
                              itemCategory.trim().toLowerCase() ===
                              activePortfolioFilter.trim().toLowerCase()
                            );
                          })
                          .map((item) => {
                            const city = item as Record<string, unknown>;

                            return Object.fromEntries(
                              Object.entries(city).filter(
                                ([cityField]) =>
                                  !portfolioHiddenFields.has(cityField),
                              ),
                            );
                          })
                        : category === "Realestate" &&
                          activeSectionType === "WhyChooseUs" &&
                          field === "whyChooseUsItems" &&
                          Array.isArray(value)
                          ? value.map((item) =>
                            item && typeof item === "object" && !Array.isArray(item)
                              ? {
                                image:
                                  typeof (item as Record<string, unknown>).image === "string"
                                    ? (item as Record<string, unknown>).image
                                    : "",
                                ...item,
                              }
                              : item,
                          )
                          : activeSectionType === "MissionVision" &&
                            field === "values" &&
                            Array.isArray(value)
                            ? value.map((item) =>
                              item && typeof item === "object" && !Array.isArray(item)
                                ? {
                                  image:
                                    typeof (item as Record<string, unknown>).image === "string"
                                      ? (item as Record<string, unknown>).image
                                      : "",
                                  ...item,
                                }
                                : item,
                            )
                            : activeSectionType === "FeaturedDevelopers" &&
                              field === "items" &&
                              Array.isArray(value)
                              ? value.map((item) => {
                                if (!item || typeof item !== "object" || Array.isArray(item)) {
                                  return item;
                                }

                                const developer = item as Record<string, unknown>;
                                return {
                                  name:
                                    typeof developer.name === "string"
                                      ? developer.name
                                      : typeof developer.title === "string"
                                        ? developer.title
                                        : "",
                                  image:
                                    typeof developer.image === "string" ? developer.image : "",
                                  alt:
                                    typeof developer.alt === "string" ? developer.alt : "",
                                };
                              })
                              : category === "Realestate" &&
                                activeSectionType === "PropertyProcess" &&
                                field === "steps" &&
                                Array.isArray(value)
                                ? value.map((item) =>
                                  item && typeof item === "object" && !Array.isArray(item)
                                    ? {
                                      image:
                                        typeof (item as Record<string, unknown>).image === "string"
                                          ? (item as Record<string, unknown>).image
                                          : "",
                                      ...item,
                                    }
                                    : item,
                                )
                                : value,
    ] as const);
  const specializedContentSchema =
    specializedContentFieldSchemas[activeSectionType];
  const automaticContentFields = specializedContentSchema
    ? Object.entries(activeGenericData ?? {})
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
  const topbarBackgroundType =
    activeTopbarData?.topbarBackgroundType ?? "solid";
  const topbarType =
    activeTopbarData?.topbarType ?? (category === "NGO" ? "sticky" : "scroll");
  const topbarSolidColor =
    activeTopbarData?.topbarBackgroundColor ??
    (category === "NGO" ? "#ffffff" : "#245c6e");
  const topbarGradientColor =
    activeTopbarData?.topbarGradientColor ??
    (category === "NGO" ? "#ff541b" : "#0668ff");
  const topbarTextColor =
    activeTopbarData?.topbarTextColor ??
    (category === "NGO" ? "#0f172a" : "#ffffff");
  const topbarPreviewBackground =
    topbarBackgroundType === "gradient"
      ? `linear-gradient(90deg, ${topbarSolidColor}, ${topbarGradientColor})`
      : topbarSolidColor;
  const headerBackgroundType =
    activeHeaderData?.headerBackgroundType ?? "solid";
  const headerType =
    activeHeaderData?.headerType ?? (category === "NGO" ? "sticky" : "scroll");
  const headerSolidColor =
    activeHeaderData?.headerBackgroundColor ??
    (category === "NGO" ? "#3d376d" : "#245c6e");
  const headerGradientColor =
    activeHeaderData?.headerGradientColor ??
    (category === "NGO" ? "#ff541b" : "#0668ff");
  const headerTextColor =
    activeHeaderData?.headerTextColor ??
    (category === "NGO" ? "#f8fafc" : "#ffffff");
  const headerPreviewBackground =
    headerBackgroundType === "gradient"
      ? `linear-gradient(90deg, ${headerSolidColor}, ${headerGradientColor})`
      : headerSolidColor;
  const explicitBannerBackgroundMode = activeBannerData?.bannerBackgroundMode;
  const bannerBackgroundMode = explicitBannerBackgroundMode ?? "image";
  const bannerSolidColor = activeBannerData?.bannerBackgroundColor ?? "#0f172a";
  const bannerGradientColor =
    activeBannerData?.bannerGradientColor ?? "#0ea5e9";
  const hasBannerHeightField =
    activeSectionType === "Banner" ||
    "bannerHeight" in (activeBannerData ?? {});
  const bannerHeight = clampBannerHeight(
    Number(activeBannerData?.bannerHeight ?? 70),
  );
  const hasBannerImageField = bannerBackgroundMode === "image";
  const hasBannerVideoField = bannerBackgroundMode === "video";
  const hasBannerColorField =
    bannerBackgroundMode === "solid" || bannerBackgroundMode === "gradient";
  const hasBannerButtonsField = "buttons" in (activeBannerData ?? {});
  const hasBannerMediaField =
    hasBannerImageField || hasBannerVideoField || hasBannerColorField;
  const hasBannerSlidesField = Array.isArray(activeBannerData?.bannerSlides);
  const isSliderBanner = hasBannerSlidesField;
  const isVideoSliderBanner = activeVariant === "Banner-4";
  const isEventsSliderBanner = category === "Events" && isSliderBanner;
  const isNGOSliderBanner = category === "NGO" && isSliderBanner;
  const isTemplateSliderBanner = isEventsSliderBanner || isNGOSliderBanner;
  const visibleBannerButtons = (activeBannerData?.buttons ?? [])
    .map((button, index) => ({ button, index }))
    .filter(({ index }) =>
      isTemplateSliderBanner ? false : !isSliderBanner || index === 1,
    );

  const activeFooterData = currentSection?.data?.[activeVariant] as
    | {
      logo?: string;
      logoImage?: string;
      logoImageTitle?: string;
      logoType?: "image" | "text" | "image-text";
      footerColumns?: { title: string; links: { label: string; href: string }[] }[];
      footerBackgroundType?: FooterBackgroundType;
      footerBackgroundColor?: string;
      footerGradientColor?: string;
      footerTextColor?: string;
      copyrightText?: string;
      legalTitle?: string;

      footerLegalLinks?: {
        label: string;
        href: string;
      }[];

      socialLinks?: {
        label: SocialLinkData["label"];
        href: string;
      }[];

      footerSocialLinks?: {
        label: SocialLinkData["label"];
        href: string;
      }[];
      whatsappLink?: string;
      callLink?: string;
    }
    | undefined;
  const visibleFooterColumns = (activeFooterData?.footerColumns ?? []).map(
    (column) =>
      column.title.trim().toLowerCase() === "tools & help"
        ? {
          ...column,
          links: column.links.filter(
            (link) => link.label.trim().toLowerCase() !== "sitemap",
          ),
        }
        : column,
  );
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
  // Footer designs that render no disclaimer block and no legal links heading.
  const footerVariantsWithoutLegalExtras = ["EventsFooter1"];
  const showFooterLegalExtras =
    category !== "Events" &&
    category !== "NGO" &&
    !footerVariantsWithoutLegalExtras.includes(activeVariant);
  const isEventsHeader =
    category === "Events" &&
    (activeVariant === "EventsHeader1" || activeSectionType === "Header");
  const isNGOHeader =
    category === "NGO" &&
    (activeVariant === "NGOHeader2" || activeSectionType === "Header");
  const isNGOFooter =
    category === "NGO" &&
    (activeVariant === "NGOFooter2" || activeSectionType === "Footer");
  const isEventsFooter =
    category === "Events" &&
    (activeVariant === "EventsFooter1" || activeSectionType === "Footer");
  const usesTypedFooterLogo = isNGOFooter || isEventsFooter;
  const resolvedFooterLogoType: "image" | "text" | "image-text" =
    activeFooterData?.logoType === "image" ||
    activeFooterData?.logoType === "text" ||
    activeFooterData?.logoType === "image-text"
      ? activeFooterData.logoType
      : activeFooterData?.logoImage && activeFooterData?.logo
        ? "image-text"
        : activeFooterData?.logoImage
          ? "image"
          : "text";
  const showFooterLogoText =
    resolvedFooterLogoType === "text" ||
    resolvedFooterLogoType === "image-text";
  const showFooterLogoImage =
    resolvedFooterLogoType === "image" ||
    resolvedFooterLogoType === "image-text";
  const isSingleCtaHeader = isEventsHeader;
  const resolvedHeaderLogoType: "image" | "text" | "image-text" =
    activeHeaderData?.logoType === "image" ||
    activeHeaderData?.logoType === "text" ||
    activeHeaderData?.logoType === "image-text"
      ? activeHeaderData.logoType
      : activeHeaderData?.logoImage && activeHeaderData?.logo
        ? "image-text"
        : activeHeaderData?.logoImage
          ? "image"
          : "text";
  const showHeaderLogoText =
    resolvedHeaderLogoType === "text" ||
    resolvedHeaderLogoType === "image-text";
  const showHeaderLogoImage =
    resolvedHeaderLogoType === "image" ||
    resolvedHeaderLogoType === "image-text";
  const topbarSocialLinks = getVisibleSocialLinks(
    activeTopbarData?.socialLinks,
  );
  const usesSectionColorPanel =
    (activeSectionType === "Topbar" && activeTab === "Topbar Layout") ||
    (activeSectionType === "Header" && activeTab === "Header Layout") ||
    (activeSectionType === "Footer" && activeTab === "Footer Layout");
  const categoryLayoutOptions = getCategoryLayoutOptions(
    category,
    activeSectionType,
  );
  const discoveredPageLayoutOptions = getCategoryPageLayoutOptions(
    category,
    activeSectionType,
  );
  const pageLayoutOptions = discoveredPageLayoutOptions.length
    ? discoveredPageLayoutOptions
    : pageLayoutsBySection[activeSectionType] ?? [];
  // Homepage Contact: home layouts only (EventsContact1, EventsContact2, ... when added).
  // Contact page variants (EventsContactPage1, EventsContactPage2, ...) stay off home.
  // Contact page uses page layout; Layout tab is hidden there for Events.
  const sectionLayoutOptions = isPageSection
    ? pageLayoutOptions
    : category === "Events" && activeSectionType === "Contact"
      ? categoryLayoutOptions.filter((layout) => {
          const variant = String(layout.componentVariant ?? layout.id);
          return !/ContactPage\d*$/i.test(variant) && !/Page\d+$/i.test(variant);
        })
      : categoryLayoutOptions;
  const layoutOptions = sectionLayoutOptions;
  const visibleLayoutOptions =
    activeSectionType === "Gallery" && layoutOptions.length > 4
      ? Array.from(
        { length: 4 },
        (_, index) =>
          layoutOptions[(galleryLayoutStart + index) % layoutOptions.length],
      )
      : layoutOptions;
  const activeAboutLayouts =
    isEventsInnerPageSubsection && subsectionScope
      ? getEventsSubsectionLayouts(activeVariant, subsectionScope.label)
      : isNGOAboutPageSubsection && subsectionScope
        ? getNGOSubsectionLayouts(activeVariant, subsectionScope.label)
      : isPageSection
        ? pageLayoutOptions
        : categoryLayoutOptions;
  const isEventsInnerSubsectionLayout =
    isEventsInnerPageSubsection &&
    Boolean(subsectionScope) &&
    activeAboutLayouts.length > 0;
  const isNGOAboutPageLayout =
    isNGOAboutPageSubsection &&
    Boolean(subsectionScope) &&
    activeAboutLayouts.length > 0;
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
        x: dragStart.modalX + event.clientX - dragStart.pointerX,
        y: dragStart.modalY + event.clientY - dragStart.pointerY,
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
    if (!currentSection || !activeTopbarData) return;

    setHasChanges(true);
    setLastChangedSection(activeSectionKey);
    onUpdateSectionData(activeSectionKey, {
      ...currentSection.data,
      [activeVariant]: {
        ...activeTopbarData,
        ...newData,
      },
    });
  };

  const updateActiveHeaderData = (newData: Record<string, unknown>) => {
    if (!currentSection || !activeHeaderData) return;

    if (Array.isArray(newData.menu)) {
      const nextPageLinks = toPageLinks(newData.menu as MenuItem[]);

      setPageLinks(nextPageLinks);
      setCurrentPage(
        nextPageLinks.some((item) => item.label === currentPage)
          ? currentPage
          : (nextPageLinks[0]?.label ?? ""),
      );
    }

    setHasChanges(true);
    setLastChangedSection(activeSectionKey);
    onUpdateSectionData(activeSectionKey, {
      ...currentSection.data,
      [activeVariant]: {
        ...activeHeaderData,
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
    if (!currentSection || !activeFooterData) return;

    setHasChanges(true);
    setLastChangedSection(activeSectionKey);
    onUpdateSectionData(activeSectionKey, {
      ...currentSection.data,
      [activeVariant]: {
        ...activeFooterData,
        ...newData,
      },
    });
  };

  const updateActiveFormDetailData = (newData: Record<string, unknown>) => {
    if (!currentSection || !activeFormDetailData) return;

    setHasChanges(true);
    setLastChangedSection(activeSectionKey);
    onUpdateSectionData(activeSectionKey, {
      ...currentSection.data,
      [activeVariant]: {
        ...activeFormDetailData,
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

  const getNgoMediaNestedContent = (): Record<string, unknown> =>
    activeGenericData?.content &&
    typeof activeGenericData.content === "object" &&
    !Array.isArray(activeGenericData.content)
      ? (activeGenericData.content as Record<string, unknown>)
      : {};

  const getNgoCareersWhyWorkWithUs = () => {
    const nested =
      activeGenericData?.whyWorkWithUs &&
      typeof activeGenericData.whyWorkWithUs === "object" &&
      !Array.isArray(activeGenericData.whyWorkWithUs)
        ? (activeGenericData.whyWorkWithUs as Record<string, unknown>)
        : {};
    return nested;
  };

  const getNgoSupportNested = (key: string) => {
    const nested = (activeGenericData as Record<string, unknown> | undefined)?.[
      key
    ];
    return nested && typeof nested === "object" && !Array.isArray(nested)
      ? (nested as Record<string, unknown>)
      : {};
  };

  const syncSupportCards = (items: unknown[]) =>
    items.map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return item;
      const rec = item as Record<string, unknown>;
      const button =
        rec.button && typeof rec.button === "object" && !Array.isArray(rec.button)
          ? (rec.button as Record<string, unknown>)
          : {};
      const action =
        rec.action && typeof rec.action === "object" && !Array.isArray(rec.action)
          ? (rec.action as Record<string, unknown>)
          : {};
      const label =
        (typeof button.label === "string" && button.label) ||
        (typeof action.label === "string" && action.label) ||
        "Learn More";
      const href =
        (typeof button.href === "string" && button.href) ||
        (typeof action.href === "string" && action.href) ||
        (typeof action.url === "string" && action.url) ||
        "#";
      return {
        ...rec,
        icon:
          (typeof rec.icon === "string" && rec.icon) ||
          (typeof rec.iconName === "string" && rec.iconName) ||
          "heart",
        iconName:
          (typeof rec.iconName === "string" && rec.iconName) ||
          (typeof rec.icon === "string" && rec.icon) ||
          "heart",
        button: { label, href },
        action: { label, url: href, href },
      };
    });

  const getGenericCollectionItems = (field: string): unknown[] | undefined => {
    if (
      category === "NGO" &&
      activeSectionType === "Careers" &&
      field === "benefits"
    ) {
      const nestedBenefits = getNgoCareersWhyWorkWithUs().benefits;
      if (Array.isArray(nestedBenefits)) return nestedBenefits;
    }

    if (
      category === "NGO" &&
      (activeSectionType === "Support" || activeSectionType === "SupportPage")
    ) {
      if (field === "values") {
        const nested = getNgoSupportNested("keyValues").values;
        if (Array.isArray(nested)) return nested;
      }
      if (field === "supportCards") {
        const nested = getNgoSupportNested("waysToSupport").supportCards;
        if (Array.isArray(nested)) return nested;
      }
      if (field === "stats") {
        const nested = getNgoSupportNested("impactStats").stats;
        if (Array.isArray(nested)) return nested;
      }
    }

    if (
      category === "NGO" &&
      (activeSectionType === "CSR" || activeSectionType === "CSRPage")
    ) {
      const nested =
        field === "focusItems"
          ? getNgoSupportNested("focusAreas").items
          : field === "pillars"
            ? getNgoSupportNested("ourImpact").pillars
            : field === "csrProjectItems"
              ? getNgoSupportNested("csrProjects").items
              : field === "coreValueItems"
                ? getNgoSupportNested("coreValues").items
                : undefined;
      if (Array.isArray(nested)) return nested;
    }

    const topLevel = (activeGenericData as Record<string, unknown> | undefined)?.[
      field
    ];
    if (Array.isArray(topLevel)) return topLevel;

    const editorItems = (
      activeGenericEditorData as Record<string, unknown> | undefined
    )?.[field];
    if (Array.isArray(editorItems)) return editorItems;

    if (
      category === "NGO" &&
      activeSectionType === "Media" &&
      field === "mediaCards"
    ) {
      const nestedCards = getNgoMediaNestedContent().mediaCards;
      if (Array.isArray(nestedCards)) return nestedCards;
    }

    return undefined;
  };

  const persistGenericCollection = (field: string, nextItems: unknown[]) => {
    if (
      category === "NGO" &&
      activeSectionType === "Media" &&
      field === "mediaCards"
    ) {
      updateActiveGenericData({
        mediaCards: nextItems,
        content: {
          ...getNgoMediaNestedContent(),
          mediaCards: nextItems,
        },
      });
      return;
    }

    if (
      category === "NGO" &&
      activeSectionType === "Careers" &&
      field === "benefits"
    ) {
      updateActiveGenericData({
        benefits: nextItems,
        whyWorkWithUs: {
          ...getNgoCareersWhyWorkWithUs(),
          benefits: nextItems,
        },
      });
      return;
    }

    if (
      category === "NGO" &&
      (activeSectionType === "Support" || activeSectionType === "SupportPage")
    ) {
      if (field === "values") {
        updateActiveGenericData({
          values: nextItems,
          keyValues: {
            ...getNgoSupportNested("keyValues"),
            values: nextItems,
          },
        });
        return;
      }
      if (field === "supportCards") {
        const synced = syncSupportCards(nextItems);
        updateActiveGenericData({
          supportCards: synced,
          waysToSupport: {
            ...getNgoSupportNested("waysToSupport"),
            supportCards: synced,
          },
        });
        return;
      }
      if (field === "stats") {
        updateActiveGenericData({
          stats: nextItems,
          impactStats: {
            ...getNgoSupportNested("impactStats"),
            stats: nextItems,
          },
        });
        return;
      }
    }

    if (
      category === "NGO" &&
      (activeSectionType === "CSR" || activeSectionType === "CSRPage")
    ) {
      if (field === "stats") {
        updateActiveGenericData({ stats: nextItems });
        return;
      }
      if (field === "focusItems") {
        updateActiveGenericData({
          focusItems: nextItems,
          focusAreas: {
            ...getNgoSupportNested("focusAreas"),
            items: nextItems,
          },
        });
        return;
      }
      if (field === "pillars") {
        updateActiveGenericData({
          pillars: nextItems,
          ourImpact: {
            ...getNgoSupportNested("ourImpact"),
            pillars: nextItems,
          },
        });
        return;
      }
      if (field === "csrProjectItems") {
        updateActiveGenericData({
          csrProjectItems: nextItems,
          csrProjects: {
            ...getNgoSupportNested("csrProjects"),
            items: nextItems,
          },
        });
        return;
      }
      if (field === "coreValueItems") {
        updateActiveGenericData({
          coreValueItems: nextItems,
          coreValues: {
            ...getNgoSupportNested("coreValues"),
            items: nextItems,
          },
        });
        return;
      }
    }

    if (isEventsHomeContact && field === "features") {
      const currentLeft =
        activeGenericData?.leftContent &&
        typeof activeGenericData.leftContent === "object" &&
        !Array.isArray(activeGenericData.leftContent)
          ? (activeGenericData.leftContent as Record<string, unknown>)
          : {};
      updateActiveGenericData({
        features: nextItems,
        leftContent: {
          ...currentLeft,
          features: nextItems,
        },
      });
      return;
    }

    updateActiveGenericData({
      [field]: nextItems,
    });
  };

  const updateActiveGenericData = (newData: Record<string, unknown>) => {
    if (!currentSection || !activeGenericData) return;

    setHasChanges(true);
    setLastChangedSection(activeSectionKey);
    if (ngoAboutNestedKey && pageVariantData) {
      onUpdateSectionData(activeSectionKey, {
        ...currentSection.data,
        [activeVariant]: {
          ...pageVariantData,
          [ngoAboutNestedKey]: {
            ...(nestedNgoAboutData ?? {}),
            ...newData,
          },
        },
      });
      return;
    }
    onUpdateSectionData(activeSectionKey, {
      ...currentSection.data,
      [activeVariant]: {
        ...activeGenericData,
        ...newData,
      },
    });
  };

  const updateCareersApplyForm = (
    patch: Record<string, unknown>,
  ) => {
    updateActiveGenericData({
      applyForm: {
        ...(activeGenericEditorData?.applyForm ?? {}),
        ...patch,
      },
    });
  };

  const updateCareersApplyFormItemField = (
    index: number,
    key: string,
    value: unknown,
  ) => {
    const nextFields = activeCareersApplyForm.fields.map((field, fieldIndex) =>
      fieldIndex === index ? { ...field, [key]: value } : field,
    );
    updateCareersApplyForm({ fields: nextFields });
  };

  const moveCareersApplyFormField = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= activeCareersApplyForm.fields.length) {
      return;
    }

    const nextFields = [...activeCareersApplyForm.fields];
    const [movedField] = nextFields.splice(fromIndex, 1);
    nextFields.splice(toIndex, 0, movedField);
    updateCareersApplyForm({ fields: nextFields });
  };

  const addCareersApplyFormField = () => {
    if (activeCareersApplyForm.fields.length >= MAX_EVENTS_CAREERS_FORM_FIELDS) {
      return;
    }

    updateCareersApplyForm({
      fields: [
        ...activeCareersApplyForm.fields,
        {
          name: `field-${Date.now()}`,
          label: "New Field",
          placeholder: "Enter value",
          type: "text",
          required: false,
          width: "half",
        },
      ],
    });
  };

  const deleteCareersApplyFormField = (index: number) => {
    if (activeCareersApplyForm.fields.length <= 1) {
      return;
    }

    updateCareersApplyForm({
      fields: activeCareersApplyForm.fields.filter(
        (_, fieldIndex) => fieldIndex !== index,
      ),
    });
    setPendingCareersFormFieldDeleteIndex(null);
  };

  const updateGenericField = (path: GenericFieldPath, value: unknown) => {
    if (
      isEventsHomeContact &&
      path.length === 1 &&
      typeof path[0] === "string"
    ) {
      const field = path[0];
      const asRecord = (item: unknown): Record<string, unknown> =>
        item && typeof item === "object" && !Array.isArray(item)
          ? (item as Record<string, unknown>)
          : {};
      const currentLeft = asRecord(activeGenericData?.leftContent);
      const currentCta = asRecord(currentLeft.cta);

      if (
        field === "leftBadge" ||
        field === "leftTitle" ||
        field === "leftTitleHighlight" ||
        field === "leftDesc" ||
        field === "features" ||
        field === "ctaLabel" ||
        field === "ctaHref"
      ) {
        const currentMain =
          typeof activeGenericData?.leftTitle === "string"
            ? String(activeGenericData.leftTitle).split("\n")[0]
            : typeof currentLeft.title === "string"
              ? currentLeft.title.split("\n")[0]
              : "";
        const currentHighlight =
          typeof activeGenericData?.leftTitleHighlight === "string"
            ? activeGenericData.leftTitleHighlight
            : typeof currentLeft.title === "string"
              ? currentLeft.title.split("\n").slice(1).join("\n")
              : "";
        const nextMain =
          field === "leftTitle" ? String(value ?? "") : currentMain;
        const nextHighlight =
          field === "leftTitleHighlight"
            ? String(value ?? "")
            : currentHighlight;
        const joinedTitle = [nextMain, nextHighlight]
          .filter((part) => part.length > 0)
          .join("\n");

        updateActiveGenericData({
          [field]: field === "leftTitle" ? nextMain : value,
          ...(field === "leftTitle" || field === "leftTitleHighlight"
            ? {
                leftTitle: nextMain,
                leftTitleHighlight: nextHighlight,
              }
            : {}),
          leftContent: {
            ...currentLeft,
            ...(field === "leftBadge" ? { badge: value } : {}),
            ...(field === "leftTitle" || field === "leftTitleHighlight"
              ? { title: joinedTitle }
              : {}),
            ...(field === "leftDesc" ? { description: value } : {}),
            ...(field === "features" ? { features: value } : {}),
            cta: {
              ...currentCta,
              ...(field === "ctaLabel" ? { label: value } : {}),
              ...(field === "ctaHref" ? { href: value } : {}),
            },
          },
        });
        return;
      }
    }

    let sourcePath = path;

    if (
      path[0] === "cities" &&
      typeof path[1] === "number" &&
      activeSectionType === "CitiesWeServe" &&
      activePortfolioFilter !== "All" &&
      Array.isArray(activeGenericData?.cities)
    ) {
      const matchingSourceIndices =
        activeGenericData.cities.flatMap(
          (item, sourceIndex) => {
            if (
              !item ||
              typeof item !== "object" ||
              Array.isArray(item)
            ) {
              return [];
            }

            const city =
              item as Record<string, unknown>;

            const itemCategory =
              typeof city.category === "string"
                ? city.category
                : typeof city.listingsLabel === "string"
                  ? city.listingsLabel
                  : "";

            return (
              itemCategory.trim().toLowerCase() ===
              activePortfolioFilter.trim().toLowerCase()
            )
              ? [sourceIndex]
              : [];
          },
        );

      const realSourceIndex =
        matchingSourceIndices[path[1]];

      if (typeof realSourceIndex === "number") {
        sourcePath = [
          path[0],
          realSourceIndex,
          ...path.slice(2),
        ];
      }
    }

    if (
      path[0] === "listings" &&
      typeof path[1] === "number" &&
      isPropertyCatalogSection(activeSectionType) &&
      Array.isArray(activeGenericData?.listings)
    ) {
      const matchingSourceIndices = activeGenericData.listings.flatMap(
        (item, sourceIndex) => {
          if (!item || typeof item !== "object" || Array.isArray(item)) {
            return [];
          }

          const categoryValue = (item as Record<string, unknown>).category;
          const itemCategory =
            typeof categoryValue === "string"
              ? categoryValue.toLowerCase()
              : "";
          const matchesPage =
            activeSectionType === "Rent"
              ? itemCategory.includes("rent")
              : itemCategory.includes("sale");

          return matchesPage ? [sourceIndex] : [];
        },
      );
      const sourceIndex = matchingSourceIndices[path[1]];

      if (typeof sourceIndex === "number") {
        sourcePath = [path[0], sourceIndex, ...path.slice(2)];
      }
    }

    const [field, ...nestedPath] = sourcePath;
    if (typeof field !== "string" || !activeGenericData) return;

    const storedSourceValue = activeGenericData[field as keyof SectionData];
    let sourceValue =
      activeSectionType === "CareerPage" &&
        field === "formFields" &&
        !Array.isArray(storedSourceValue)
        ? defaultCareerFormFields
        : (activeSectionType === "CitiesWeServe" ||
          activeSectionType === "PopularEvents" ||
          activeVariant === "RealEstateProject1") &&
          field === "tabs" &&
          !Array.isArray(storedSourceValue)
          ? (activeGenericEditorData as Record<string, unknown>).tabs
          : storedSourceValue === undefined
            ? (activeGenericEditorData as Record<string, unknown>)[field]
            : storedSourceValue;

    if (
      category === "NGO" &&
      (activeSectionType === "Contact" ||
        isNGOFrenchiseSection ||
        isNGOEnquirySection) &&
      field === "form" &&
      sourceValue &&
      typeof sourceValue === "object" &&
      !Array.isArray(sourceValue)
    ) {
      const form = sourceValue as Record<string, unknown>;
      if (form.fields && !Array.isArray(form.fields) && typeof form.fields === "object") {
        const fields = form.fields as Record<string, unknown>;
        sourceValue = {
          ...form,
          fields: Object.entries(fields).map(([key, value]) => {
            const entry =
              value && typeof value === "object" && !Array.isArray(value)
                ? (value as Record<string, unknown>)
                : {};
            return {
              name: key,
              label: typeof entry.label === "string" ? entry.label : key,
              placeholder:
                typeof entry.placeholder === "string" ? entry.placeholder : "",
              type:
                typeof entry.type === "string"
                  ? entry.type
                  : key === "message"
                    ? "textarea"
                    : "text",
              width:
                typeof entry.width === "string"
                  ? entry.width
                  : key === "message"
                    ? "full"
                    : "half",
            };
          }),
        };
      }
    }

    const nextValue = setValueAtPath(
      sourceValue,
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

    if (
      activeSectionType === "PopularEvents" &&
      field === "tabs" &&
      Array.isArray(nextValue)
    ) {
      const previousTabs = Array.isArray(sourceValue)
        ? sourceValue.filter(
          (item): item is string => typeof item === "string",
        )
        : [];
      const nextTabs = nextValue.filter(
        (item): item is string => typeof item === "string",
      );
      const renamedIndex =
        typeof nestedPath[0] === "number" ? nestedPath[0] : -1;
      const oldCategoryName =
        renamedIndex >= 0 && typeof previousTabs[renamedIndex] === "string"
          ? previousTabs[renamedIndex]
          : null;
      const newCategoryName =
        renamedIndex >= 0 && typeof nextTabs[renamedIndex] === "string"
          ? nextTabs[renamedIndex]
          : null;
      const nextEvents = Array.isArray(activeGenericData.events)
        ? activeGenericData.events.map((item) => {
          if (!item || typeof item !== "object" || Array.isArray(item)) {
            return item;
          }

          const event = item as Record<string, unknown>;
          if (
            oldCategoryName &&
            newCategoryName &&
            oldCategoryName !== newCategoryName &&
            event.category === oldCategoryName
          ) {
            return {
              ...event,
              category: newCategoryName,
            };
          }

          return event;
        })
        : activeGenericData.events;

      updateActiveGenericData({
        tabs: nextTabs,
        categories: nextTabs,
        events: nextEvents,
      });
      return;
    }

    if (
      category === "Events" &&
      activeSectionType === "Contact" &&
      isPageSection &&
      field === "contactItems" &&
      Array.isArray(nextValue)
    ) {
      updateActiveGenericData({
        contactItems: nextValue.map((item) => {
          if (!item || typeof item !== "object" || Array.isArray(item)) {
            return item;
          }
          const record = item as Record<string, unknown>;
          const lines = String(record.value ?? "").split("\n");
          const value2 =
            typeof record.value2 === "string"
              ? record.value2
              : lines.slice(1).join("\n");
          return {
            ...record,
            value: lines[0] ?? "",
            value2,
          };
        }),
      });
      return;
    }

    if (
      category === "Events" &&
      activeSectionType === "Gallery" &&
      field === "cards" &&
      typeof nestedPath[0] === "number" &&
      nestedPath[1] === "badge" &&
      Array.isArray(nextValue)
    ) {
      const cardIndex = nestedPath[0];
      updateActiveGenericData({
        cards: nextValue.map((item, index) => {
          if (
            index !== cardIndex ||
            !item ||
            typeof item !== "object" ||
            Array.isArray(item)
          ) {
            return item;
          }

          const record = item as Record<string, unknown>;
          return {
            ...record,
            subtitle: record.badge,
          };
        }),
      });
      return;
    }

    if (isEventsHomeContact && field === "features") {
      const currentLeft =
        activeGenericData.leftContent &&
        typeof activeGenericData.leftContent === "object" &&
        !Array.isArray(activeGenericData.leftContent)
          ? (activeGenericData.leftContent as Record<string, unknown>)
          : {};
      updateActiveGenericData({
        features: nextValue,
        leftContent: {
          ...currentLeft,
          features: nextValue,
        },
      });
      return;
    }

    if (
      category === "NGO" &&
      activeSectionType === "Media" &&
      (field === "mediaCards" || field === "sectionTitle")
    ) {
      const nestedContent = getNgoMediaNestedContent();
      updateActiveGenericData({
        [field]: nextValue,
        content: {
          ...nestedContent,
          [field]: nextValue,
        },
      });
      return;
    }

    if (
      category === "NGO" &&
      activeSectionType === "Careers" &&
      (field === "title" || field === "desc" || field === "benefits")
    ) {
      const nestedWhy = getNgoCareersWhyWorkWithUs();
      updateActiveGenericData({
        [field]: nextValue,
        whyWorkWithUs: {
          ...nestedWhy,
          ...(field === "title" ? { title: nextValue } : {}),
          ...(field === "desc" ? { description: nextValue } : {}),
          ...(field === "benefits" ? { benefits: nextValue } : {}),
        },
      });
      return;
    }

    if (
      category === "NGO" &&
      (activeSectionType === "Support" || activeSectionType === "SupportPage")
    ) {
      const asAction = (value: unknown) => {
        const rec =
          value && typeof value === "object" && !Array.isArray(value)
            ? (value as Record<string, unknown>)
            : {};
        const label = typeof rec.label === "string" ? rec.label : "";
        const href =
          (typeof rec.href === "string" && rec.href) ||
          (typeof rec.url === "string" && rec.url) ||
          "";
        return { label, href, url: href };
      };

      if (
        field === "pretitle" ||
        field === "title" ||
        field === "desc" ||
        field === "values"
      ) {
        updateActiveGenericData({
          [field]: nextValue,
          introduction: {
            ...getNgoSupportNested("introduction"),
            ...(field === "pretitle" ? { topBadge: nextValue } : {}),
            ...(field === "title" ? { heading: nextValue } : {}),
            ...(field === "desc" ? { description: nextValue } : {}),
          },
          ...(field === "desc" ? { description: nextValue } : {}),
          ...(field === "values"
            ? {
                keyValues: {
                  ...getNgoSupportNested("keyValues"),
                  values: nextValue,
                },
              }
            : {}),
        });
        return;
      }

      if (
        field === "waysPretitle" ||
        field === "waysTitle" ||
        field === "supportCards"
      ) {
        const cards = Array.isArray(nextValue)
          ? syncSupportCards(nextValue)
          : nextValue;
        updateActiveGenericData({
          [field]: field === "supportCards" ? cards : nextValue,
          waysToSupport: {
            ...getNgoSupportNested("waysToSupport"),
            ...(field === "waysPretitle" ? { topBadge: nextValue } : {}),
            ...(field === "waysTitle" ? { heading: nextValue } : {}),
            ...(field === "supportCards" ? { supportCards: cards } : {}),
          },
        });
        return;
      }

      if (
        field === "impactPretitle" ||
        field === "impactTitle" ||
        field === "stats" ||
        field === "closingText"
      ) {
        updateActiveGenericData({
          [field]: nextValue,
          impactStats: {
            ...getNgoSupportNested("impactStats"),
            ...(field === "impactPretitle" ? { topBadge: nextValue } : {}),
            ...(field === "impactTitle" ? { heading: nextValue } : {}),
            ...(field === "stats" ? { stats: nextValue } : {}),
            ...(field === "closingText" ? { closingText: nextValue } : {}),
          },
        });
        return;
      }

      if (
        field === "ctaPretitle" ||
        field === "ctaTitle" ||
        field === "ctaDesc" ||
        field === "ctaImage" ||
        field === "ctaPrimaryButton" ||
        field === "ctaSecondaryButton"
      ) {
        const currentCta = getNgoSupportNested("ctaBanner");
        const currentImage =
          currentCta.bannerImage &&
          typeof currentCta.bannerImage === "object" &&
          !Array.isArray(currentCta.bannerImage)
            ? (currentCta.bannerImage as Record<string, unknown>)
            : {};
        updateActiveGenericData({
          [field]: nextValue,
          ctaBanner: {
            ...currentCta,
            ...(field === "ctaPretitle" ? { topBadge: nextValue } : {}),
            ...(field === "ctaTitle" ? { heading: nextValue } : {}),
            ...(field === "ctaDesc" ? { description: nextValue } : {}),
            ...(field === "ctaImage"
              ? {
                  bannerImage: {
                    ...currentImage,
                    src: nextValue,
                  },
                }
              : {}),
            ...(field === "ctaPrimaryButton"
              ? { primaryAction: asAction(nextValue) }
              : {}),
            ...(field === "ctaSecondaryButton"
              ? { secondaryAction: asAction(nextValue) }
              : {}),
          },
        });
        return;
      }

      if (
        field === "transparencyIcon" ||
        field === "transparencyTitle" ||
        field === "transparencyDesc" ||
        field === "transparencyButton"
      ) {
        updateActiveGenericData({
          [field]: nextValue,
          transparencyBar: {
            ...getNgoSupportNested("transparencyBar"),
            ...(field === "transparencyIcon" ? { iconName: nextValue } : {}),
            ...(field === "transparencyTitle" ? { title: nextValue } : {}),
            ...(field === "transparencyDesc" ? { pretitle: nextValue } : {}),
            ...(field === "transparencyButton"
              ? { action: asAction(nextValue) }
              : {}),
          },
        });
        return;
      }
    }

    if (
      category === "NGO" &&
      activeSectionType === "Gallery" &&
      (field === "pretitle" || field === "title" || field === "desc")
    ) {
      const currentBadge =
        activeGenericData.badge &&
        typeof activeGenericData.badge === "object" &&
        !Array.isArray(activeGenericData.badge)
          ? (activeGenericData.badge as Record<string, unknown>)
          : {};
      updateActiveGenericData({
        [field]: nextValue,
        ...(field === "pretitle"
          ? { badge: { ...currentBadge, label: nextValue } }
          : {}),
        ...(field === "desc" ? { description: nextValue } : {}),
      });
      return;
    }

    if (
      category === "NGO" &&
      (activeSectionType === "FAQ" || activeSectionType === "FAQPage") &&
      (field === "pretitle" || field === "title" || field === "desc")
    ) {
      const currentBadge =
        activeGenericData.badge &&
        typeof activeGenericData.badge === "object" &&
        !Array.isArray(activeGenericData.badge)
          ? (activeGenericData.badge as Record<string, unknown>)
          : {};
      updateActiveGenericData({
        [field]: nextValue,
        ...(field === "pretitle"
          ? { badge: { ...currentBadge, label: nextValue } }
          : {}),
        ...(field === "desc" ? { description: nextValue } : {}),
      });
      return;
    }

    if (
      category === "NGO" &&
      (activeSectionType === "Partners" || activeSectionType === "PartnersPage") &&
      (field === "pretitle" || field === "title" || field === "desc")
    ) {
      const currentBadge =
        activeGenericData.badge &&
        typeof activeGenericData.badge === "object" &&
        !Array.isArray(activeGenericData.badge)
          ? (activeGenericData.badge as Record<string, unknown>)
          : {};
      updateActiveGenericData({
        [field]: nextValue,
        ...(field === "pretitle"
          ? { badge: { ...currentBadge, label: nextValue } }
          : {}),
        ...(field === "desc" ? { description: nextValue } : {}),
      });
      return;
    }

    if (
      category === "NGO" &&
      activeSectionType === "Contact" &&
      field === "mapEmbedUrl"
    ) {
      const currentMap =
        activeGenericData.map &&
        typeof activeGenericData.map === "object" &&
        !Array.isArray(activeGenericData.map)
          ? (activeGenericData.map as Record<string, unknown>)
          : {};
      updateActiveGenericData({
        mapEmbedUrl: nextValue,
        map: {
          ...currentMap,
          embedUrl: nextValue,
        },
      });
      return;
    }

    if (category === "NGO" && isNGOFrenchiseSection) {
      const asRecord = (value: unknown): Record<string, unknown> =>
        value && typeof value === "object" && !Array.isArray(value)
          ? (value as Record<string, unknown>)
          : {};
      const currentHeader = asRecord(activeGenericData.header);
      const currentLeft = asRecord(activeGenericData.leftSection);
      const currentForm = asRecord(activeGenericData.form);
      const currentProcess = asRecord(activeGenericData.processSection);
      const currentBanner = asRecord(activeGenericData.contactBanner);
      const currentLeftImage = asRecord(currentLeft.image);
      const currentCtaImage = asRecord(currentBanner.image);

      if (field === "pretitle" || field === "title" || field === "desc") {
        updateActiveGenericData({
          ...(field === "title" ? { heading: nextValue } : { [field]: nextValue }),
          ...(field === "desc" ? { description: nextValue } : {}),
          header: {
            ...currentHeader,
            ...(field === "pretitle" ? { label: nextValue } : {}),
            ...(field === "title" ? { heading: nextValue } : {}),
            ...(field === "desc" ? { description: nextValue } : {}),
          },
        });
        return;
      }

      if (
        field === "leftPretitle" ||
        field === "leftTitle" ||
        field === "leftDesc" ||
        field === "leftPoints" ||
        field === "leftImage" ||
        field === "leftImageAlt"
      ) {
        updateActiveGenericData({
          [field]: nextValue,
          leftSection: {
            ...currentLeft,
            ...(field === "leftPretitle" ? { label: nextValue } : {}),
            ...(field === "leftTitle" ? { title: nextValue } : {}),
            ...(field === "leftDesc" ? { description: nextValue } : {}),
            ...(field === "leftPoints" ? { points: nextValue } : {}),
            image: {
              ...currentLeftImage,
              ...(field === "leftImage" ? { src: nextValue } : {}),
              ...(field === "leftImageAlt" ? { alt: nextValue } : {}),
            },
          },
        });
        return;
      }

      if (field === "formTitle" || field === "formPretitle") {
        updateActiveGenericData({
          [field]: nextValue,
          form: {
            ...currentForm,
            ...(field === "formTitle" ? { title: nextValue } : {}),
            ...(field === "formPretitle" ? { pretitle: nextValue } : {}),
          },
        });
        return;
      }

      if (field === "processPretitle" || field === "processTitle" || field === "steps") {
        updateActiveGenericData({
          [field]: nextValue,
          processSection: {
            ...currentProcess,
            ...(field === "processPretitle" ? { label: nextValue } : {}),
            ...(field === "processTitle" ? { title: nextValue } : {}),
            ...(field === "steps" ? { steps: nextValue } : {}),
          },
        });
        return;
      }

      if (
        field === "ctaTitle" ||
        field === "ctaPretitle" ||
        field === "ctaDesc" ||
        field === "ctaPhone" ||
        field === "ctaEmail" ||
        field === "ctaHours" ||
        field === "ctaImage" ||
        field === "ctaImageAlt"
      ) {
        updateActiveGenericData({
          [field]: nextValue,
          contactBanner: {
            ...currentBanner,
            ...(field === "ctaTitle" ? { title: nextValue } : {}),
            ...(field === "ctaPretitle" ? { pretitle: nextValue } : {}),
            ...(field === "ctaDesc" ? { description: nextValue } : {}),
            ...(field === "ctaPhone" ? { phone: nextValue } : {}),
            ...(field === "ctaEmail" ? { email: nextValue } : {}),
            ...(field === "ctaHours" ? { workingHours: nextValue } : {}),
            image: {
              ...currentCtaImage,
              ...(field === "ctaImage" ? { src: nextValue } : {}),
              ...(field === "ctaImageAlt" ? { alt: nextValue } : {}),
            },
          },
        });
        return;
      }
    }

    if (category === "NGO" && isNGOEnquirySection) {
      const asRecord = (value: unknown): Record<string, unknown> =>
        value && typeof value === "object" && !Array.isArray(value)
          ? (value as Record<string, unknown>)
          : {};
      const currentHeader = asRecord(activeGenericData.header);
      const currentLeft = asRecord(activeGenericData.leftSection);
      const currentForm = asRecord(activeGenericData.form);
      const currentContact = asRecord(activeGenericData.contactSection);
      const currentFooter = asRecord(activeGenericData.footerBanner);
      const currentLeftImage = asRecord(currentLeft.image);
      const currentButton = asRecord(currentFooter.button);

      if (field === "pretitle" || field === "title" || field === "desc") {
        updateActiveGenericData({
          [field]: nextValue,
          ...(field === "title" ? { heading: nextValue } : {}),
          ...(field === "desc" ? { description: nextValue } : {}),
          header: {
            ...currentHeader,
            ...(field === "pretitle" ? { label: nextValue } : {}),
            ...(field === "title" ? { heading: nextValue } : {}),
            ...(field === "desc" ? { description: nextValue } : {}),
          },
        });
        return;
      }

      if (
        field === "leftTitle" ||
        field === "leftDesc" ||
        field === "leftFeatures" ||
        field === "leftImage" ||
        field === "leftImageAlt"
      ) {
        updateActiveGenericData({
          [field]: nextValue,
          leftSection: {
            ...currentLeft,
            ...(field === "leftTitle" ? { title: nextValue } : {}),
            ...(field === "leftDesc" ? { description: nextValue } : {}),
            ...(field === "leftFeatures" ? { features: nextValue } : {}),
            image: {
              ...currentLeftImage,
              ...(field === "leftImage" ? { src: nextValue } : {}),
              ...(field === "leftImageAlt" ? { alt: nextValue } : {}),
            },
          },
        });
        return;
      }

      if (field === "formTitle") {
        updateActiveGenericData({
          formTitle: nextValue,
          form: {
            ...currentForm,
            title: nextValue,
          },
        });
        return;
      }

      if (
        field === "contactTitle" ||
        field === "contactPretitle" ||
        field === "contactDesc" ||
        field === "contactItems"
      ) {
        updateActiveGenericData({
          [field]: nextValue,
          contactSection: {
            ...currentContact,
            ...(field === "contactTitle" ? { title: nextValue } : {}),
            ...(field === "contactPretitle" ? { pretitle: nextValue } : {}),
            ...(field === "contactDesc" ? { description: nextValue } : {}),
            ...(field === "contactItems" ? { items: nextValue } : {}),
          },
        });
        return;
      }

      if (
        field === "ctaIcon" ||
        field === "ctaText" ||
        field === "ctaSubtext" ||
        field === "ctaButtonLabel" ||
        field === "ctaButtonHref" ||
        field === "ctaButtonIcon"
      ) {
        updateActiveGenericData({
          [field]: nextValue,
          footerBanner: {
            ...currentFooter,
            ...(field === "ctaIcon" ? { icon: nextValue } : {}),
            ...(field === "ctaText" ? { text: nextValue } : {}),
            ...(field === "ctaSubtext" ? { subtext: nextValue } : {}),
            button: {
              ...currentButton,
              ...(field === "ctaButtonLabel" ? { label: nextValue } : {}),
              ...(field === "ctaButtonHref" ? { href: nextValue } : {}),
              ...(field === "ctaButtonIcon" ? { icon: nextValue } : {}),
            },
          },
        });
        return;
      }
    }

    if (
      category === "NGO" &&
      (activeSectionType === "CSR" || activeSectionType === "CSRPage")
    ) {
      const asAction = (value: unknown) => {
        const rec =
          value && typeof value === "object" && !Array.isArray(value)
            ? (value as Record<string, unknown>)
            : {};
        const label =
          (typeof rec.label === "string" && rec.label) ||
          (typeof rec.text === "string" && rec.text) ||
          "";
        const href =
          (typeof rec.href === "string" && rec.href) ||
          (typeof rec.url === "string" && rec.url) ||
          "";
        return { label, href, text: label };
      };

      if (
        field === "pretitle" ||
        field === "title" ||
        field === "desc" ||
        field === "stats"
      ) {
        const currentHeader = getNgoSupportNested("header");
        const currentTitle = currentHeader.title;
        const syncedStats = Array.isArray(nextValue)
          ? nextValue.map((item) => {
              if (!item || typeof item !== "object" || Array.isArray(item)) {
                return item;
              }
              const rec = item as Record<string, unknown>;
              const icon =
                (typeof rec.icon === "string" && rec.icon) ||
                (typeof rec.iconName === "string" && rec.iconName) ||
                "heart";
              return { ...rec, icon, iconName: icon };
            })
          : nextValue;
        updateActiveGenericData({
          ...(field === "title"
            ? {}
            : { [field]: field === "stats" ? syncedStats : nextValue }),
          ...(field === "desc" ? { description: nextValue } : {}),
          header: {
            ...currentHeader,
            ...(field === "pretitle" ? { topBadge: nextValue } : {}),
            ...(field === "title"
              ? {
                  title:
                    typeof nextValue === "string"
                      ? nextValue
                      : currentTitle,
                }
              : {}),
            ...(field === "desc" ? { pretitle: nextValue } : {}),
          },
        });
        return;
      }

      if (field === "focusPretitle" || field === "focusItems") {
        updateActiveGenericData({
          [field]: nextValue,
          focusAreas: {
            ...getNgoSupportNested("focusAreas"),
            ...(field === "focusPretitle" ? { topBadge: nextValue } : {}),
            ...(field === "focusItems" ? { items: nextValue } : {}),
          },
        });
        return;
      }

      if (
        field === "impactPretitle" ||
        field === "impactDesc" ||
        field === "impactButton" ||
        field === "pillars"
      ) {
        const currentImpact = getNgoSupportNested("ourImpact");
        updateActiveGenericData({
          [field]: nextValue,
          ourImpact: {
            ...currentImpact,
            ...(field === "impactPretitle" ? { topBadge: nextValue } : {}),
            ...(field === "impactDesc" ? { description: nextValue } : {}),
            ...(field === "impactButton"
              ? { ctaButton: asAction(nextValue) }
              : {}),
            ...(field === "pillars" ? { pillars: nextValue } : {}),
          },
        });
        return;
      }

      if (field === "projectsPretitle" || field === "csrProjectItems") {
        updateActiveGenericData({
          [field]: nextValue,
          csrProjects: {
            ...getNgoSupportNested("csrProjects"),
            ...(field === "projectsPretitle" ? { topBadge: nextValue } : {}),
            ...(field === "csrProjectItems" ? { items: nextValue } : {}),
          },
        });
        return;
      }

      if (field === "ctaTitle" || field === "ctaDesc" || field === "ctaButton") {
        const currentCta = getNgoSupportNested("bannerCta");
        const action = field === "ctaButton" ? asAction(nextValue) : null;
        updateActiveGenericData({
          [field]: nextValue,
          bannerCta: {
            ...currentCta,
            ...(field === "ctaTitle" ? { title: nextValue } : {}),
            ...(field === "ctaDesc" ? { description: nextValue } : {}),
            ...(action
              ? { buttonText: action.label, href: action.href }
              : {}),
          },
        });
        return;
      }

      if (field === "coreValueItems") {
        updateActiveGenericData({
          coreValueItems: nextValue,
          coreValues: {
            ...getNgoSupportNested("coreValues"),
            items: nextValue,
          },
        });
        return;
      }
    }

    if (
      category === "NGO" &&
      activeSectionType === "TestimonialsPage"
    ) {
      if (
        field === "pretitle" ||
        field === "title" ||
        field === "highlight" ||
        field === "desc"
      ) {
        const currentBadge =
          activeGenericData.badge &&
          typeof activeGenericData.badge === "object" &&
          !Array.isArray(activeGenericData.badge)
            ? (activeGenericData.badge as Record<string, unknown>)
            : {};
        const currentTitle =
          activeGenericData.title &&
          typeof activeGenericData.title === "object" &&
          !Array.isArray(activeGenericData.title)
            ? (activeGenericData.title as Record<string, unknown>)
            : {};
        const line1 =
          field === "title"
            ? nextValue
            : (typeof currentTitle.line1 === "string" && currentTitle.line1) ||
              (typeof activeGenericData.title === "string"
                ? activeGenericData.title
                : "Don't Believe Us?");
        const highlight =
          field === "highlight"
            ? nextValue
            : (typeof currentTitle.highlight === "string" &&
                currentTitle.highlight) ||
              (typeof activeGenericData.highlight === "string"
                ? activeGenericData.highlight
                : "See Review");
        updateActiveGenericData({
          [field]: nextValue,
          ...(field === "desc" ? { description: nextValue } : {}),
          ...(field === "pretitle"
            ? { badge: { ...currentBadge, label: nextValue } }
            : {}),
          ...(field === "title" || field === "highlight"
            ? { title: { ...currentTitle, line1, highlight } }
            : {}),
        });
        return;
      }
    }

    if (
      category === "NGO" &&
      (activeSectionType === "Brochure" || activeSectionType === "BrochurePage")
    ) {
      if (field === "pretitle" || field === "title" || field === "desc") {
        const currentHeader =
          activeGenericData.header &&
          typeof activeGenericData.header === "object" &&
          !Array.isArray(activeGenericData.header)
            ? (activeGenericData.header as Record<string, unknown>)
            : {};
        updateActiveGenericData({
          ...(field === "title" ? { heading: nextValue } : { [field]: nextValue }),
          ...(field === "desc" ? { description: nextValue } : {}),
          header: {
            ...currentHeader,
            ...(field === "pretitle" ? { label: nextValue } : {}),
            ...(field === "title" ? { heading: nextValue } : {}),
            ...(field === "desc" ? { description: nextValue } : {}),
          },
        });
        return;
      }

      if (field === "listPretitle" || field === "listTitle") {
        const currentSectionTitle =
          activeGenericData.sectionTitle &&
          typeof activeGenericData.sectionTitle === "object" &&
          !Array.isArray(activeGenericData.sectionTitle)
            ? (activeGenericData.sectionTitle as Record<string, unknown>)
            : {};
        updateActiveGenericData({
          [field]: nextValue,
          sectionTitle: {
            ...currentSectionTitle,
            ...(field === "listPretitle" ? { label: nextValue } : {}),
            ...(field === "listTitle" ? { heading: nextValue } : {}),
          },
        });
        return;
      }
    }

    if (category === "NGO" && activeSectionType === "CaseStudy") {
      if (
        field === "pretitle" ||
        field === "title" ||
        field === "desc"
      ) {
        const currentBadge =
          activeGenericData.badge &&
          typeof activeGenericData.badge === "object" &&
          !Array.isArray(activeGenericData.badge)
            ? (activeGenericData.badge as Record<string, unknown>)
            : {};
        updateActiveGenericData({
          ...(field === "title" ? { heading: nextValue } : { [field]: nextValue }),
          ...(field === "desc" ? { description: nextValue } : {}),
          ...(field === "pretitle"
            ? { badge: { ...currentBadge, label: nextValue } }
            : {}),
        });
        return;
      }

      if (field === "ctaTitle" || field === "ctaDesc" || field === "ctaButton") {
        const currentCta =
          activeGenericData.cta &&
          typeof activeGenericData.cta === "object" &&
          !Array.isArray(activeGenericData.cta)
            ? (activeGenericData.cta as Record<string, unknown>)
            : {};
        const action =
          field === "ctaButton" &&
          nextValue &&
          typeof nextValue === "object" &&
          !Array.isArray(nextValue)
            ? (nextValue as Record<string, unknown>)
            : {};
        updateActiveGenericData({
          [field]: nextValue,
          cta: {
            ...currentCta,
            ...(field === "ctaTitle" ? { title: nextValue } : {}),
            ...(field === "ctaDesc" ? { description: nextValue } : {}),
            ...(field === "ctaButton"
              ? {
                  button: {
                    label:
                      (typeof action.label === "string" && action.label) || "",
                    href: (typeof action.href === "string" && action.href) || "",
                  },
                }
              : {}),
          },
        });
        return;
      }
    }

    if (
      category === "NGO" &&
      (activeSectionType === "CaseDetails" ||
        activeSectionType === "CaseDetailsPage")
    ) {
      const asRecord = (value: unknown): Record<string, unknown> =>
        value && typeof value === "object" && !Array.isArray(value)
          ? (value as Record<string, unknown>)
          : {};
      const currentMain = asRecord(activeGenericData.mainContent);
      const currentPrimary = asRecord(currentMain.primaryArticle);
      const currentSecondary = asRecord(currentMain.secondaryArticle);
      const currentImage = asRecord(currentPrimary.mainImage);
      const currentSidebar = asRecord(activeGenericData.sidebar);

      if (
        field === "pageTitle" ||
        field === "primaryTitle" ||
        field === "primaryImage" ||
        field === "primaryImageAlt" ||
        field === "primaryParagraphs" ||
        field === "postedOn" ||
        field === "secondaryTitle" ||
        field === "secondaryParagraphs"
      ) {
        updateActiveGenericData({
          [field]: nextValue,
          mainContent: {
            ...currentMain,
            primaryArticle: {
              ...currentPrimary,
              ...(field === "primaryTitle" ? { title: nextValue } : {}),
              ...(field === "primaryParagraphs"
                ? { paragraphs: nextValue }
                : {}),
              mainImage: {
                ...currentImage,
                ...(field === "primaryImage" ? { src: nextValue } : {}),
                ...(field === "primaryImageAlt" ? { alt: nextValue } : {}),
              },
            },
            secondaryArticle: {
              ...currentSecondary,
              ...(field === "postedOn" ? { postedOn: nextValue } : {}),
              ...(field === "secondaryTitle" ? { title: nextValue } : {}),
              ...(field === "secondaryParagraphs"
                ? { paragraphs: nextValue }
                : {}),
            },
          },
        });
        return;
      }

      if (
        field === "popularPostsTitle" ||
        field === "popularPosts"
      ) {
        updateActiveGenericData({
          [field]: nextValue,
          sidebar: {
            ...currentSidebar,
            ...(field === "popularPostsTitle"
              ? { popularPostsTitle: nextValue }
              : {}),
            ...(field === "popularPosts" ? { popularPosts: nextValue } : {}),
          },
        });
        return;
      }
    }

    updateActiveGenericData({
      [field]: nextValue,
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

  const renderFooterContentField = (fieldName: string) => {
    if (
      !activeGenericData ||
      !Object.prototype.hasOwnProperty.call(activeGenericData, fieldName)
    ) {
      return null;
    }

    return (
      <GenericFieldEditor
        key={fieldName}
        fieldName={fieldName}
        value={activeGenericData[fieldName as keyof SectionData]}
        path={[fieldName]}
        sectionType="Footer"
        onChange={updateGenericField}
        onMediaChange={updateGenericMedia}
        availablePageNames={availablePageNames}
      />
    );
  };

  const addGenericCollectionItem = (
    path: GenericFieldPath,
    visibleItems: unknown[],
  ) => {
    const [field] = path;
    if (typeof field !== "string") return;

    if (
      path.length === 3 &&
      path[0] === "listings" &&
      path[2] === "features"
    ) {
      if (visibleItems.length >= 5) return;
      updateGenericField(path, [
        ...visibleItems,
        { label: "New feature", value: "Value" },
      ]);
      return;
    }

    if (
      path.length === 2 &&
      (path[0] === "vision" || path[0] === "mission") &&
      path[1] === "points"
    ) {
      updateGenericField(path, [
        ...visibleItems,
        { icon: "IconSparkles", text: "New point" },
      ]);
      return;
    }

    if (
      path.length === 1 &&
      field === "leftFeatures" &&
      isNGOEnquirySection
    ) {
      if (visibleItems.length >= MAX_NGO_ENQUIRY_LEFT_FEATURES) return;
      updateGenericField(path, [
        ...visibleItems,
        {
          icon: "users",
          title: "New Feature",
          description: "Add a short feature description.",
        },
      ]);
      return;
    }

    if (path.length === 1 && field === "features" && isEventsHomeContact) {
      updateGenericField(path, [
        ...visibleItems,
        {
          icon: "shield",
          title: "New Feature",
          description: "Add a short description.",
        },
      ]);
      return;
    }

    if (
      path.length === 1 &&
      field === "contactItems" &&
      isNGOEnquirySection
    ) {
      if (visibleItems.length >= MAX_NGO_ENQUIRY_CONTACT_ITEMS) return;
      updateGenericField(path, [
        ...visibleItems,
        {
          icon: "phone",
          label: "New Contact",
          value: "Add contact details.",
        },
      ]);
      return;
    }

    if (
      path.length === 2 &&
      path[0] === "form" &&
      path[1] === "fields" &&
      (activeSectionType === "Contact" ||
        isNGOFrenchiseSection ||
        isNGOEnquirySection)
    ) {
      if (
        isNGOFrenchiseSection &&
        visibleItems.length >= MAX_NGO_FRENCHISE_FORM_FIELDS
      ) {
        return;
      }
      if (
        isNGOEnquirySection &&
        visibleItems.length >= MAX_NGO_ENQUIRY_FORM_FIELDS
      ) {
        return;
      }
      if (
        category === "Events" &&
        activeSectionType === "Contact" &&
        visibleItems.length >= MAX_EVENTS_CONTACT_FORM_FIELDS
      ) {
        return;
      }
      if (
        category === "NGO" &&
        (activeSectionType === "Contact" ||
          activeSectionType === "ContactPage") &&
        !isNGOFrenchiseSection &&
        !isNGOEnquirySection &&
        visibleItems.length >= MAX_NGO_CONTACT_FORM_FIELDS
      ) {
        return;
      }
      updateGenericField(path, [
        ...visibleItems,
        category === "NGO"
          ? {
              label: "New Field",
              placeholder: "Enter value",
              type: "text",
              width: "half",
            }
          : { placeholder: "New field *", type: "text", width: "half" },
      ]);
      return;
    }

    if (
      path.length === 2 &&
      path[0] === "leftContent" &&
      path[1] === "features" &&
      activeSectionType === "Contact"
    ) {
      updateGenericField(path, [
        ...visibleItems,
        {
          icon: "shield",
          title: "New Card Title",
          description: "Add card description here.",
        },
      ]);
      return;
    }

    // Nested string lists inside a card (e.g. sections[0].content)
    if (
      (path.length > 1 || field === "tabs") &&
      (visibleItems.length === 0 ||
        visibleItems.every((item) => typeof item === "string"))
    ) {
      updateGenericField(path, [...visibleItems, "New item"]);
      return;
    }

    const storedItems = getGenericCollectionItems(field);
    const items = Array.isArray(storedItems)
      ? storedItems
      : Array.isArray(visibleItems)
        ? visibleItems
        : [];
    if (
      activeSectionType === "PropertyProcess" &&
      field === "steps" &&
      items.length >= MAX_PROPERTY_PROCESS_STEPS
    ) {
      return;
    }
    if (
      activeSectionType === "Features" &&
      field === "features" &&
      items.length >= MAX_FEATURE_CARDS
    ) {
      return;
    }
    if (
      (activeSectionType === "Blog" || activeSectionType === "BlogPage") &&
      (field === "blogItems" || field === "galleryItems") &&
      items.length >= MAX_BLOG_CARDS
    ) {
      return;
    }
    if (
      category === "Events" &&
      activeSectionType === "About" &&
      field === "stats" &&
      items.length >= 1
    ) {
      return;
    }
    if (
      category === "Events" &&
      activeSectionType === "About" &&
      field === "buttons" &&
      items.length >= 1
    ) {
      return;
    }
    if (
      category === "NGO" &&
      (activeSectionType === "About" ||
        activeSectionType === "AboutPage" ||
        activeSectionType === "AboutUsPage") &&
      field === "buttons" &&
      items.length >= 2
    ) {
      return;
    }
    if (
      category === "NGO" &&
      (activeSectionType === "About" ||
        activeSectionType === "AboutPage" ||
        activeSectionType === "AboutUsPage") &&
      field === "trustBadges" &&
      items.length >= 3
    ) {
      return;
    }
    if (
      category === "NGO" &&
      (activeSectionType === "About" ||
        activeSectionType === "AboutPage" ||
        activeSectionType === "AboutUsPage") &&
      field === "statistics" &&
      items.length >= 4
    ) {
      return;
    }
    if (
      category === "NGO" &&
      (activeSectionType === "AboutPage" ||
        activeSectionType === "AboutUsPage") &&
      field === "tabs" &&
      items.length >= 4
    ) {
      return;
    }
    if (
      category === "NGO" &&
      (activeSectionType === "AboutPage" ||
        activeSectionType === "AboutUsPage") &&
      field === "cards" &&
      items.length >= 6
    ) {
      return;
    }

    if (
      category === "NGO" &&
      activeSectionType === "Causes" &&
      field === "items" &&
      items.length >= 6
    ) {
      return;
    }

    if (
      category === "NGO" &&
      activeSectionType === "Footer" &&
      field === "recentNews" &&
      items.length >= 3
    ) {
      return;
    }

    const newItems: Record<string, unknown> = {
      productItems: {
        title: "New Product",
        category: "Product Category",
        desc: "Add the product description here.",
        image: "",
        alt: "Product image",
        link: "",
      },
      productSlides: {
        image: "",
        alt: "Product image",
        link: "",
        productTitle: "New Product",
        productSubtitle: "Product Category",
        productInfoTitle: "Product Details",
        productInfoDesc: "Add the product description here.",
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
      questions: {
        question: "New question",
        answer: "Add the answer here.",
      },
      partnersList: {
        name: "New Partner",
        logo: "",
        website: "https://",
      },
      focusItems: {
        image: "",
        icon: "heart",
        iconName: "heart",
        title: "New Focus Area",
        description: "Add a short description.",
      },
      csrProjectItems: {
        image: "",
        title: "New CSR Project",
        description: "Add a short project description.",
      },
      pillars: {
        icon: "heart",
        iconName: "heart",
        title: "New Pillar",
        description: "Add a short description.",
      },
      coreValueItems: {
        icon: "heart",
        iconName: "heart",
        title: "New Value",
        description: "Add a short description.",
      },
      sections: {
        title: "New section",
        content: ["Add section details here."],
      },
      conditions: {
        title: "New Refund Condition",
        content: "Add refund policy details here.",
      },
      galleryItems: {
        image: "",
        alt: "Gallery image",
        title: "New gallery image",
      },
      awardItems: {
        year: String(new Date().getFullYear()),
        title: "New Award",
        org: "Award organization",
        image: "",
        alt: "Award badge",
      },
      blogItems: {
        title: "New Article",
        excerpt: "Add a short article summary.",
        date: "Today",
        image: "",
        alt: "Article image",
        href: "/blog",
      },
      stats: {
        stat: "100+",
        label: "New statistic",
        desc: "Add a short description.",
      },
      statistics: {
        icon: "children",
        value: "100+",
        label: "New statistic",
      },
      trustBadges: {
        icon: "check",
        text: "New badge",
        desc: "Short support text",
      },
      buttons: {
        label: "View More",
        href: "/about",
        variant: "primary",
        icon: "heart",
      },
      contactItems: {
        icon: "location",
        label: "NEW DETAIL",
        value: "Add contact detail here.",
      },
      skills: {
        title: "New skill",
        description: "A key part of the experience I bring to every project.",
      },
      experience: {
        period: "2020 - Present",
        role: "New Role",
        organization: "Organization",
        description: "Add a short description.",
      },
      achievements: {
        title: "New Achievement",
        description: "Add a short description.",
      },
      listings: {
        image: "",
        statusText: "New listing",
        propertyType: "Apartment",
        price: "Price",
        title: "New Property",
        subtitle: "Property highlight",
        infoTitle: "Property overview",
        location: "Location",
        description: "Add the property description here.",
        body: "Add detailed property information here.",
        alt: "Property image",
        features: [
          { label: "Bedrooms", value: "3" },
          { label: "Area", value: "1,500 sq.ft" },
        ],
        category: currentSection?.page?.toLowerCase() === "rent" ? "For Rent" : "For Sale",
        button: { label: "Book a visit", href: "/contact" },
        slug: getNextPropertySlug(items),
        href: `/properties/${getNextPropertySlug(items)}`,
      },
      features: {
        title: "New feature",
        desc: "Add a short feature description.",
        icon: "location",
        image: "",
      },
      whyChooseUsItems: {
        title: "New reason",
        desc: "Explain why visitors should choose you.",
        image: "",
        stat: "01",
      },
      projectItems: {
        title: "New project",
        location: "Location",
        category: "Residential",
        image: "",
        alt: "Project image",
        status: "Ongoing",
        desc: "Add a short project description.",
        body: "Add detailed project information here.",
        slug: getNextProjectSlug(items),
        href: `/projects/${getNextProjectSlug(items)}`,
      },
      cities: {
        title: "New city",
        image: "",
        alt: "City image",
        category: "NCR",
        listingsLabel: "Homes",
      },
      items: {
        name: "New item",
        title: "New item",
        desc: "Add a short description.",
        image: "",
        alt: "Item image",
      },
      ...(category === "NGO" && activeSectionType === "Causes"
        ? {
            items: {
              image: { src: "", alt: "Cause image" },
              icon: "education",
              category: "#Education",
              title: "New Cause",
              titleLink: "/case-details",
              description: "Add cause description here.",
              button: { label: "Donate Now", href: "/donate" },
            },
          }
        : {}),
      ...(category === "NGO" && activeSectionType === "CaseStudy"
        ? {
            items: {
              image: { src: "", alt: "Case study image" },
              icon: "education",
              category: "#Education",
              title: "New Case Study",
              titleLink: "/case-details",
              description: "Add a short case study description.",
              button: { label: "Read More", href: "/case-details" },
            },
          }
        : {}),
      ...(category === "NGO" &&
      (activeSectionType === "Services" ||
        activeSectionType === "ServicesPage")
        ? {
            items: {
              id: `service-${Date.now()}`,
              title: "New Service",
              description: "Add a short service description.",
              image: "",
              icon: "heart",
              link: "/services",
              label: "Learn More",
            },
          }
        : {}),
      ...(category === "NGO" &&
      (activeSectionType === "Teams" ||
        activeSectionType === "TeamsPage")
        ? {
            members: {
              name: "New Member",
              textLink: "/team-detail",
              designation: "Role",
              description: "Add a short bio.",
              image: "",
              socials: [
                { icon: "facebook", href: "#" },
                { icon: "linkedin", href: "#" },
                { icon: "instagram", href: "#" },
              ],
            },
          }
        : {}),
      ...(category === "NGO" && activeSectionType === "TeamDetail"
        ? {
            skills: {
              skill: "New Skill",
              percentage: 80,
            },
            stats: {
              value: "10+",
              label: "New Stat",
            },
          }
        : {}),
      ...(category === "NGO" && activeSectionType === "Media"
        ? {
            mediaCards: {
              title: "New Media",
              image: "",
              articleUrl: "",
            },
          }
        : {}),
      ...(category === "NGO" && activeSectionType === "Industry"
        ? {
            sectors: {
              image: "",
              icon: "heart",
              iconName: "heart",
              title: "New Industry",
              description: "Add a short industry description.",
            },
            metrics: {
              icon: "heart",
              value: "100+",
              label: "New Metric",
            },
          }
        : {}),
      ...(category === "NGO" && activeSectionType === "Branches"
        ? {
            stats: {
              icon: "building",
              value: "10+",
              label: "New Stat",
              subLabel: "Add a short note.",
            },
            branches: {
              city: "New City",
              address: "Add branch address here.",
              phone: "+91 00000 00000",
            },
            contactItems: {
              icon: "mail",
              label: "New Contact",
              value: "info@ngo.org",
            },
          }
        : {}),
      ...(category === "NGO" && activeSectionType === "AwardsPage"
        ? {
            stats: {
              icon: "trophy",
              value: "10+",
              label: "New Stat",
            },
            awards: {
              image: "",
              title: "New Award",
              description: "Add a short award description.",
              year: String(new Date().getFullYear()),
            },
          }
        : {}),
      ...(category === "NGO" && activeSectionType === "Careers"
        ? {
            benefits: {
              icon: "heart",
              title: "New Benefit",
              description: "Add a short benefit description.",
              desc: "Add a short benefit description.",
            },
            jobs: {
              title: "New Role",
              description: "Add a short job description.",
              location: "New Delhi, India",
              employmentType: "Full Time",
            },
          }
        : {}),
      ...(category === "NGO" &&
      (activeSectionType === "Support" || activeSectionType === "SupportPage")
        ? {
            values: {
              icon: "heart",
              iconName: "heart",
              title: "New Value",
              description: "Add a short value description.",
            },
            supportCards: {
              icon: "heart",
              iconName: "heart",
              title: "New Way to Support",
              description: "Add a short description.",
              button: { label: "Learn More", href: "#" },
              action: { label: "Learn More", url: "#" },
            },
            stats: {
              icon: "heart",
              iconName: "heart",
              value: "100+",
              label: "New Impact",
            },
          }
        : {}),
      ...(category === "NGO" &&
      (activeSectionType === "Projects" ||
        activeSectionType === "ProjectsPage")
        ? {
            items: {
              image: "",
              icon: "book",
              category: "Education",
              title: "New Project",
              description: "Add project description here.",
              button: { label: "Learn More", href: "/project-detail" },
            },
          }
        : {}),
      ...(category === "NGO" &&
      (activeSectionType === "Events" ||
        activeSectionType === "EventsPage")
        ? {
            events: {
              image: "",
              title: "New Event",
              href: "/event-details",
              button: { label: "Join Now", href: "/contact-us" },
            },
          }
        : {}),
      ...(category === "NGO" &&
      (activeSectionType === "Testimonial" ||
        activeSectionType === "TestimonialsPage")
        ? {
            testimonials: {
              image: "",
              name: "New Reviewer",
              designation: "Supporter",
              rating: 5,
              message: "Add the testimonial here.",
            },
          }
        : {}),
      ...(category === "NGO" && activeSectionType === "Blog"
        ? {
            articles: {
              image: "",
              category: "News",
              date: "22 January",
              title: "New Blog Post",
              description: "Add a short blog summary.",
              href: "/blog-detail",
            },
          }
        : {}),
      ...(category === "NGO" && activeSectionType === "Gallery"
        ? {
            categories: {
              label: "New Category",
              value: `category-${Date.now()}`,
            },
            images: {
              image: "",
              category: "",
            },
          }
        : {}),
      ...(category === "NGO" &&
      (activeSectionType === "FAQ" || activeSectionType === "FAQPage")
        ? {
            questions: {
              question: "New question",
              answer: "Add the answer here.",
            },
          }
        : {}),
      ...(category === "NGO" &&
      (activeSectionType === "Partners" || activeSectionType === "PartnersPage")
        ? {
            partnersList: {
              name: "New Partner",
              logo: "",
              website: "#",
            },
          }
        : {}),
      ...(category === "NGO" &&
      (activeSectionType === "CSR" || activeSectionType === "CSRPage")
        ? {
            stats: {
              icon: "heart",
              iconName: "heart",
              value: "100+",
              label: "New Stat",
            },
            focusItems: {
              image: "",
              icon: "heart",
              iconName: "heart",
              title: "New Focus Area",
              description: "Add a short description.",
            },
            pillars: {
              icon: "heart",
              iconName: "heart",
              title: "New Pillar",
              description: "Add a short description.",
            },
            csrProjectItems: {
              image: "",
              title: "New CSR Project",
              description: "Add a short project description.",
            },
            coreValueItems: {
              icon: "heart",
              iconName: "heart",
              title: "New Value",
              description: "Add a short description.",
            },
          }
        : {}),
      ...(category === "NGO" &&
      (activeSectionType === "Brochure" || activeSectionType === "BrochurePage")
        ? {
            features: {
              icon: "file-text",
              title: "New Feature",
              description: "Add a short feature description.",
            },
            brochures: {
              name: "New Brochure",
              description: "Add a short brochure description.",
              image: "",
              downloadUrl: "/brochures/overview.pdf",
              downloadlabel: "Download",
            },
            ctaStats: {
              icon: "users",
              value: "100+",
              label: "New Stat",
            },
          }
        : {}),
      ...(category === "NGO" && activeSectionType === "CaseStudy"
        ? {
            items: {
              image: { src: "", alt: "Case study image" },
              icon: "education",
              category: "#Education",
              title: "New Case Study",
              titleLink: "/case-details",
              description: "Add a short case study description.",
              button: { label: "Read More", href: "/case-details" },
            },
          }
        : {}),
      ...(category === "NGO" &&
      (activeSectionType === "CaseDetails" ||
        activeSectionType === "CaseDetailsPage")
        ? {
            popularPosts: {
              image: "",
              date: "June 30, 2025",
              category: "Poor",
              title: "New Popular Post",
              slug: "/blog-details",
            },
            primaryParagraphs: "New paragraph.",
            secondaryParagraphs: "New paragraph.",
          }
        : {}),
      ...(category === "NGO" && isNGOFrenchiseSection
        ? {
            features: {
              icon: "handshake",
              title: "New Feature",
              description: "Add a short feature description.",
            },
            leftPoints: "New partnership benefit.",
            steps: {
              icon: "handshake",
              title: "New Step",
              description: "Add a short process description.",
            },
          }
        : {}),
      ...(category === "NGO" && isNGOEnquirySection
        ? {
            leftFeatures: {
              icon: "users",
              title: "New Feature",
              description: "Add a short feature description.",
            },
            contactItems: {
              icon: "phone",
              label: "New Contact",
              value: "Add contact details.",
            },
          }
        : {}),
      ...(category === "NGO" && activeSectionType === "Footer"
        ? {
            recentNews: {
              image: "",
              date: "22 January 2026",
              title: "New Blog Post",
              href: "/blog-detail",
            },
          }
        : {}),
      steps: {
        title: "New step",
        desc: "Describe this process step.",
        image: "",
      },
      programs: {
        title: "New program",
        desc: "Describe this program.",
        image: "",
        amount: "New initiative",
      },
      values: {
        title: "New value",
        desc: "Describe this value.",
        image: "",
      },
      benefits: {
        icon: "heart",
        title: "New Benefit",
        description: "Add a short benefit description.",
        desc: "Add a short benefit description.",
      },
      culture: {
        title: "New culture value",
        description: "Describe this culture value.",
      },
      jobs: {
        title: "New role",
        location: "Location",
        type: "Full-time",
        desc: "Describe this role.",
      },
      roles: {
        id: `role-${Date.now()}`,
        title: "New role",
        location: "Location",
        type: "Full-time",
        description: "Describe this role.",
        applyHref: "/contact",
      },
      categories: {
        title: "New category",
        desc: "Describe this category.",
        image: "",
      },
      collectionItems: {
        brand: "Brand",
        title: "New collection",
        desc: "Describe this collection.",
        image: "",
      },
      impactStats: {
        stat: "100+",
        label: "Impact",
      },
      groups: {
        title: "New group",
        links: [{ label: "Link", href: "#" }],
      },
      events: {
        image: "",
        seats: "100",
        date: "Date",
        location: "Location",
        title: "New event",
        description: "Add a short event description.",
        link: "#",
        category: "Wedding Events",
        id: `event-${Date.now()}`,
      },
      images: {
        src: "",
        alt: "Gallery image",
      },
      cards: {
        image: "",
        title: "New gallery image",
        subtitle: "Weddings",
        badge: "Weddings",
      },
      content: {
        type: "paragraph",
        text: "Add paragraph text.",
      },
      relatedPosts: {
        image: "",
        alt: "Blog image",
        label: "Trends",
        title: "New related post",
        description: "Add a short blog summary.",
        link: "/blog",
      },
      milestones: {
        year: "2026",
        title: "New milestone",
        description: "Describe this milestone.",
      },
      coreBeliefs: {
        icon: "IconSparkles",
        title: "New belief",
        description: "Describe this core belief.",
      },
      points: {
        icon: "IconSparkles",
        text: "New point",
      },
      departments: {
        label: "New department",
        value: "new-department",
      },
      awards: {
        year: "2026",
        title: "New award",
        body: "Award body",
        category: "Excellence",
        icon: "IconTrophy",
        description: "Describe this award.",
      },
      ctaItems: {
        value: "100+",
        label: "New highlight",
      },
      members: {
        id: `member-${Date.now()}`,
        image: "",
        name: "New member",
        role: "Role",
        department: "management",
        bio: "Add a short bio.",
        social: {
          linkedin: "#",
          twitter: "#",
          instagram: "#",
        },
      },
    };
    const templateItem = newItems[field];
    const lastItem = items[items.length - 1];
    const clonedItem =
      lastItem && typeof lastItem === "object" && !Array.isArray(lastItem)
        ? {
          ...(lastItem as Record<string, unknown>),
          ...(typeof (lastItem as Record<string, unknown>).title === "string"
            ? { title: `New ${(lastItem as Record<string, unknown>).title}` }
            : {}),
          ...(typeof (lastItem as Record<string, unknown>).name === "string"
            ? { name: `New ${(lastItem as Record<string, unknown>).name}` }
            : {}),
        }
        : undefined;
    const baseNewItem = templateItem ?? clonedItem;

    if (!baseNewItem) return;

    const categoryValues = Array.isArray(activeGenericData?.categories)
      ? activeGenericData.categories.filter(
        (item): item is string => typeof item === "string" && Boolean(item.trim()),
      )
      : [];
    const newItem =
      field === "cards" &&
      category === "NGO" &&
      (activeSectionType === "AboutPage" ||
        activeSectionType === "AboutUsPage")
        ? {
          icon: "target",
          title: "New Card",
          desc: "Add a short description.",
        }
      : field === "cards" &&
        category === "Events" &&
        activeSectionType === "Gallery"
        ? {
          image: "",
          imageAlt: "",
          badge: eventsGalleryTabSelectOptions[0]?.value ?? "WEDDINGS",
          subtitle: eventsGalleryTabSelectOptions[0]?.value ?? "WEDDINGS",
        }
      : field === "events" &&
      category !== "NGO" &&
      baseNewItem &&
      typeof baseNewItem === "object" &&
      !Array.isArray(baseNewItem)
        ? {
          ...(baseNewItem as Record<string, unknown>),
          category:
            categoryValues[0] ??
            (typeof (baseNewItem as Record<string, unknown>).category === "string"
              ? (baseNewItem as Record<string, unknown>).category
              : "Wedding Events"),
          id: `event-${Date.now()}`,
        }
        : field === "items" &&
            category === "NGO" &&
            activeSectionType === "Causes"
          ? {
            image: { src: "", alt: "Cause image" },
            icon: "education",
            category: "#Education",
            title: "New Cause",
            titleLink: "/case-details",
            description: "Add a short description.",
            button: { label: "Donate Now", href: "/donate" },
          }
        : field === "items" &&
            category === "NGO" &&
            activeSectionType === "CaseStudy"
          ? {
            image: { src: "", alt: "Case study image" },
            icon: "education",
            category: "#Education",
            title: "New Case Study",
            titleLink: "/case-details",
            description: "Add a short description.",
            button: { label: "Read More", href: "/case-details" },
          }
        : field === "popularPosts" &&
            category === "NGO" &&
            (activeSectionType === "CaseDetails" ||
              activeSectionType === "CaseDetailsPage")
          ? {
            image: "",
            date: "June 30, 2025",
            category: "Poor",
            title: "New Popular Post",
            slug: "/blog-details",
          }
        : field === "primaryParagraphs" &&
            category === "NGO" &&
            (activeSectionType === "CaseDetails" ||
              activeSectionType === "CaseDetailsPage")
          ? "New paragraph."
        : field === "secondaryParagraphs" &&
            category === "NGO" &&
            (activeSectionType === "CaseDetails" ||
              activeSectionType === "CaseDetailsPage")
          ? "New paragraph."
        : field === "features" &&
            category === "NGO" &&
            isNGOFrenchiseSection
          ? {
            icon: "handshake",
            title: "New Feature",
            description: "Add a short feature description.",
          }
        : field === "leftPoints" &&
            category === "NGO" &&
            isNGOFrenchiseSection
          ? "New partnership benefit."
        : field === "steps" &&
            category === "NGO" &&
            isNGOFrenchiseSection
          ? {
            icon: "handshake",
            title: "New Step",
            description: "Add a short process description.",
          }
        : field === "leftFeatures" &&
            category === "NGO" &&
            isNGOEnquirySection
          ? {
            icon: "users",
            title: "New Feature",
            description: "Add a short feature description.",
          }
        : field === "contactItems" &&
            category === "NGO" &&
            isNGOEnquirySection
          ? {
            icon: "phone",
            label: "New Contact",
            value: "Add contact details.",
          }
        : field === "items" &&
            activeSectionType === "Awards"
          ? {
            icon: "IconAward",
            value: "10+",
            title: "NEW AWARD",
            description: "Add a short award description.",
          }
        : field === "items" &&
            category === "Events" &&
            activeSectionType === "EventCategories"
          ? {
            badge: "New",
            title: "New Event Category",
            description: "Add a short category description.",
            image: "",
            imageAlt: "Event category",
            href: "/events",
          }
        : field === "testimonialItems" &&
            category === "Events" &&
            activeSectionType === "Testimonial"
          ? {
            initials: "NC",
            name: "New Customer",
            role: "Customer",
            quote: "Add the customer testimonial here.",
            rating: "5",
          }
        : field === "stats" && category === "Events"
          ? activeSectionType === "OurStory" ||
              activeSectionType === "AwardsPage"
            ? { value: "100+", label: "New statistic" }
            : {
              value: "100+",
              label: "New statistic",
              desc: "Add a short description.",
            }
        : field === "blogItems" &&
            category === "Events" &&
            activeSectionType === "Blog"
          ? {
            image: "",
            alt: "Blog image",
            label: "Trends",
            title: "New Blog Post",
            description: "Add a short blog summary.",
            date: "Today",
            slug: "new-blog-post",
            link: "/blog/new-blog-post",
          }
        : field === "roles" &&
            category === "Events" &&
            activeSectionType === "Careers"
          ? {
            id: `role-${Date.now()}`,
            title: "New role",
            location: "Location",
            type: "Full-time",
            description: "Describe this open role.",
          }
        : field === "whyJoinUs" &&
            category === "Events" &&
            activeSectionType === "Careers"
          ? {
            icon: "IconSparkles",
            title: "New benefit",
            description: "Describe why candidates should join.",
          }
        : field === "members" &&
            category === "NGO" &&
            (activeSectionType === "Teams" ||
              activeSectionType === "TeamsPage")
          ? {
            name: "New Member",
            textLink: "/team-detail",
            designation: "Role",
            description: "Add a short bio.",
            image: "",
            socials: [
              { icon: "facebook", href: "#" },
              { icon: "linkedin", href: "#" },
              { icon: "instagram", href: "#" },
            ],
          }
        : field === "members" &&
            category === "Events" &&
            (activeSectionType === "Teams" || activeSectionType === "Team")
          ? {
            image: "",
            name: "New member",
            role: "Role",
            department:
              eventsTeamDepartmentSelectOptions[0]?.value ?? "management",
            bio: "Add a short bio.",
            social: {
              linkedin: "#",
              twitter: "#",
              instagram: "#",
            },
          }
        : field === "jobs" &&
            category === "NGO" &&
            activeSectionType === "Careers"
          ? {
            title: "New Role",
            description: "Add a short job description.",
            location: "New Delhi, India",
            employmentType: "Full Time",
          }
        : field === "values" &&
            category === "NGO" &&
            (activeSectionType === "Support" ||
              activeSectionType === "SupportPage")
          ? {
            icon: "heart",
            iconName: "heart",
            title: "New Value",
            description: "Add a short value description.",
          }
        : field === "supportCards" &&
            category === "NGO" &&
            (activeSectionType === "Support" ||
              activeSectionType === "SupportPage")
          ? {
            icon: "heart",
            iconName: "heart",
            title: "New Way to Support",
            description: "Add a short description.",
            button: { label: "Learn More", href: "#" },
            action: { label: "Learn More", url: "#" },
          }
        : field === "stats" &&
            category === "NGO" &&
            (activeSectionType === "Support" ||
              activeSectionType === "SupportPage")
          ? {
            icon: "heart",
            iconName: "heart",
            value: "100+",
            label: "New Impact",
          }
        : field === "categories" &&
            category === "NGO" &&
            activeSectionType === "Gallery"
          ? {
            label: "New Category",
            value: `category-${Date.now()}`,
          }
        : field === "images" &&
            category === "NGO" &&
            activeSectionType === "Gallery"
          ? {
            image: "",
            category: Array.isArray(activeGenericData?.categories)
              ? (
                  (activeGenericData.categories as unknown[])
                    .map((item) => {
                      if (!item || typeof item !== "object" || Array.isArray(item)) {
                        return "";
                      }
                      const record = item as Record<string, unknown>;
                      const value =
                        typeof record.value === "string" ? record.value.trim() : "";
                      return value === "all" ? "" : value;
                    })
                    .find(Boolean) ?? ""
                )
              : "",
          }
        : field === "partnersList"
          ? {
            name: "New Partner",
            logo: "",
            website: "https://",
          }
        : field === "focusItems" &&
            category === "NGO"
          ? {
            image: "",
            icon: "heart",
            iconName: "heart",
            title: "New Focus Area",
            description: "Add a short description.",
          }
        : field === "csrProjectItems" &&
            category === "NGO"
          ? {
            image: "",
            title: "New CSR Project",
            description: "Add a short project description.",
          }
        : field === "pillars" &&
            category === "NGO"
          ? {
            icon: "heart",
            iconName: "heart",
            title: "New Pillar",
            description: "Add a short description.",
          }
        : field === "coreValueItems" &&
            category === "NGO"
          ? {
            icon: "heart",
            iconName: "heart",
            title: "New Value",
            description: "Add a short description.",
          }
        : field === "brochures" &&
            category === "NGO"
          ? {
            name: "New Brochure",
            description: "Add a short brochure description.",
            image: "",
            downloadUrl: "/brochures/overview.pdf",
            downloadlabel: "Download",
          }
        : field === "ctaStats" &&
            category === "NGO"
          ? {
            icon: "users",
            value: "100+",
            label: "New Stat",
          }
        : field === "stats" &&
            category === "NGO" &&
            (activeSectionType === "CSR" || activeSectionType === "CSRPage")
          ? {
            icon: "heart",
            iconName: "heart",
            value: "100+",
            label: "New Stat",
          }
        : field === "questions" &&
            category === "NGO"
          ? {
            question: "New question",
            answer: "Add the answer here.",
          }
        : field === "contactItems" &&
            category === "NGO" &&
            activeSectionType === "Contact"
          ? {
            icon: "phone",
            title: "New Detail",
            value: "Add contact detail here.",
          }
        : field === "cards" &&
            category === "NGO" &&
            activeSectionType === "Contact"
          ? {
            icon: "headset",
            title: "New Feature",
            description: "Add a short feature description.",
          }
        : baseNewItem;

    const cardFieldsForNewItem =
      field === "partnersList"
        ? ["logo", "name", "website"]
        : field === "questions" || field === "faqItems"
          ? ["question", "answer"]
          : [];
    const nextItem =
      newItem && typeof newItem === "object" && !Array.isArray(newItem)
        ? cardFieldsForNewItem.reduce<Record<string, unknown>>((acc, key) => {
            if (!(key in acc)) acc[key] = "";
            return acc;
          }, { ...(newItem as Record<string, unknown>) })
        : newItem;

    persistGenericCollection(field, [...items, nextItem]);
  };

  const deleteGenericCollectionItem = (
    path: GenericFieldPath,
    index: number,
    visibleItem: unknown,
    visibleItems: unknown[],
  ) => {
    const [field] = path;
    if (typeof field !== "string") return;

    if (
      path.length === 3 &&
      path[0] === "listings" &&
      path[2] === "features"
    ) {
      updateGenericField(
        path,
        visibleItems.filter((_, itemIndex) => itemIndex !== index),
      );
      return;
    }

    if (
      path.length === 2 &&
      (path[0] === "vision" || path[0] === "mission") &&
      path[1] === "points"
    ) {
      updateGenericField(
        path,
        visibleItems.filter((_, itemIndex) => itemIndex !== index),
      );
      return;
    }

    if (
      path.length === 2 &&
      ((path[0] === "form" && path[1] === "fields") ||
        (path[0] === "leftContent" && path[1] === "features")) &&
      activeSectionType === "Contact"
    ) {
      updateGenericField(
        path,
        visibleItems.filter((_, itemIndex) => itemIndex !== index),
      );
      return;
    }

    // Nested string lists inside a card (e.g. sections[0].content)
    if (
      (path.length > 1 || field === "tabs") &&
      (visibleItems.length === 0 ||
        visibleItems.every((item) => typeof item === "string"))
    ) {
      updateGenericField(
        path,
        visibleItems.filter((_, itemIndex) => itemIndex !== index),
      );
      return;
    }

    const items = getGenericCollectionItems(field);

    if (!Array.isArray(items)) return;

    let sourceIndex = index;

    if (
      visibleItem &&
      typeof visibleItem === "object" &&
      !Array.isArray(visibleItem)
    ) {
      const visibleEntries = Object.entries(
        visibleItem as Record<string, unknown>,
      );

      const matchedIndex = items.findIndex((candidate) => {
        if (
          !candidate ||
          typeof candidate !== "object" ||
          Array.isArray(candidate)
        ) {
          return false;
        }

        const candidateRecord =
          candidate as Record<string, unknown>;

        return visibleEntries.every(
          ([key, value]) =>
            JSON.stringify(candidateRecord[key]) ===
            JSON.stringify(value),
        );
      });

      if (matchedIndex >= 0) {
        sourceIndex = matchedIndex;
      }
    }

    const nextItems = items.filter(
      (_, itemIndex) => itemIndex !== sourceIndex,
    );
    persistGenericCollection(field, nextItems);
  };

  const handleSidebarTabChange = (tab: string) => {
    setActiveTab(tab);
    setMobileSidebarOpen(false);
  };

  const selectSectionVariant = (variant: string) => {
    const isListedLayout = sectionLayoutOptions.some(
      (layout) =>
        layout.id === variant || layout.componentVariant === variant,
    );
    const isAllowedVariant =
      Boolean(currentSection?.data?.[variant]) ||
      variant.startsWith(`${activeSectionType}-`) ||
      (isPageSection && variant.startsWith(`${activeSectionType}Page-`)) ||
      isListedLayout;

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
        const categoryDefault = getCategoryVariantData(
          category,
          activeSectionType,
          variant,
        );
        const sourceData =
          categoryDefault ??
          currentSection.data[activeVariant] ??
          Object.values(currentSection.data)[0];

        onUpdateSectionData(activeSectionKey, {
          ...currentSection.data,
          [variant]: sourceData,
        });
      }

      setHasChanges(true);
      setLastChangedSection(activeSectionKey);
    }

    onSelectVariant(activeSectionKey, variant);
  };

  const handleDone = () => {
    if (hasChanges) {
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

    updateActiveHeaderData({ menu: updatedMenu });
  };

  const addMenuItem = () => {
    if (menuItems.length >= MAX_MENU_LINKS) return;

    const updatedMenu = [
      ...menuItems,
      {
        label: "New Item",
        href: "/new-item",
      },
    ];

    updateActiveHeaderData({ menu: updatedMenu });
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
    if (category === "NGO" && field === "location") {
      updateActiveTopbarData({ location: value, address: value });
      return;
    }
    if (category === "NGO" && field === "phone") {
      updateActiveTopbarData({
        phone: value,
        phoneHref: value ? `tel:${value.replace(/\s+/g, "")}` : "",
      });
      return;
    }
    updateActiveTopbarData({ [field]: value });
  };

  const updateTopbarCta = (field: "label" | "href", value: string) => {
    const currentCta = activeTopbarData?.headerCta ?? {};
    const nextCta = { ...currentCta, [field]: value };
    updateActiveTopbarData({
      headerCta: nextCta,
      buttons: [{ label: nextCta.label ?? "", href: nextCta.href ?? "#" }],
    });
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
      { label: "instagram" as const, href: "#" },
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

  const updateHeaderLogoType = (logoType: "image" | "text" | "image-text") => {
    const nextData: Record<string, unknown> = { logoType };

    if (
      logoType !== "image" &&
      typeof activeHeaderData?.logo === "string" &&
      activeHeaderData.logo.includes("/")
    ) {
      nextData.logo = "NGO";
    }

    updateActiveHeaderData(nextData);
  };

  const updateHeaderLogo = (logo: string) => {
    // Keep logo text as display text only (never a media path).
    if (logo.includes("/") || logo.startsWith("data:")) return;
    updateActiveHeaderData({ logo });
  };

  const updateHeaderLogoImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;

      updateActiveHeaderData({
        logoImage: reader.result,
        logoImageTitle: file.name,
        ...(activeHeaderData?.logoType
          ? {}
          : {
              logoType:
                activeHeaderData?.logo?.trim()
                  ? "image-text"
                  : "image",
            }),
      });
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const updateHeaderButton = (
    index: number,
    field: "label" | "href" | "variant",
    value: string,
  ) => {
    const nextValue = field === "label" ? limitLinkText(value) : value;
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
      { label: "New Button", href: "#", variant: "primary" },
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

  const getNGOHeaderPopupData = () => activeHeaderData?.PopupData ?? {};

  const updateNGOHeaderPopupData = (
    nextPopup: NonNullable<typeof activeHeaderData>["PopupData"],
  ) => {
    updateActiveHeaderData({ PopupData: nextPopup });
  };

  const updateNGOAboutPopup = (field: "title" | "desc", value: string) => {
    const popup = getNGOHeaderPopupData();
    updateNGOHeaderPopupData({
      ...popup,
      aboutpopup: {
        ...(popup.aboutpopup ?? {}),
        [field]: value,
      },
    });
  };

  const updateNGOInstagramPopup = (field: "title", value: string) => {
    const popup = getNGOHeaderPopupData();
    updateNGOHeaderPopupData({
      ...popup,
      instagram: {
        ...(popup.instagram ?? {}),
        [field]: value,
      },
    });
  };

  const updateNGOInstagramImage = (
    index: number,
    field: "src" | "alt",
    value: string,
  ) => {
    const popup = getNGOHeaderPopupData();
    const images = [...(popup.instagram?.images ?? [])];
    images[index] = { ...(images[index] ?? {}), [field]: value };
    updateNGOHeaderPopupData({
      ...popup,
      instagram: {
        ...(popup.instagram ?? {}),
        images,
      },
    });
  };

  const addNGOInstagramImage = () => {
    const popup = getNGOHeaderPopupData();
    const images = [...(popup.instagram?.images ?? [])];
    if (images.length >= 8) return;
    images.push({ src: "", alt: "Gallery image" });
    updateNGOHeaderPopupData({
      ...popup,
      instagram: {
        ...(popup.instagram ?? {}),
        images,
      },
    });
  };

  const deleteNGOInstagramImage = (index: number) => {
    const popup = getNGOHeaderPopupData();
    const images = (popup.instagram?.images ?? []).filter(
      (_, imageIndex) => imageIndex !== index,
    );
    updateNGOHeaderPopupData({
      ...popup,
      instagram: {
        ...(popup.instagram ?? {}),
        images,
      },
    });
  };

  const confirmPendingNGOInstagramImageDelete = () => {
    if (pendingNGOInstagramImageDelete === null) return;
    deleteNGOInstagramImage(pendingNGOInstagramImageDelete.index);
    setPendingNGOInstagramImageDelete(null);
  };

  const uploadNGOInstagramImage = (
    index: number,
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      const popup = getNGOHeaderPopupData();
      const images = [...(popup.instagram?.images ?? [])];
      images[index] = {
        ...(images[index] ?? {}),
        src: reader.result,
        alt: file.name,
      };
      updateNGOHeaderPopupData({
        ...popup,
        instagram: {
          ...(popup.instagram ?? {}),
          images,
        },
      });
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const updateNGOContactPopup = (
    field: "phone" | "email" | "separator",
    value: string,
  ) => {
    const popup = getNGOHeaderPopupData();
    const nextContact = {
      ...(popup.contactpopup ?? {}),
      [field]: value,
    };
    if (field === "phone") {
      nextContact.phoneHref = value
        ? `tel:${value.replace(/\s+/g, "")}`
        : "";
    }
    if (field === "email") {
      nextContact.emailHref = value ? `mailto:${value}` : "";
    }
    updateNGOHeaderPopupData({
      ...popup,
      contactpopup: nextContact,
    });
  };

  const updateNGOPopupSocialLink = (
    index: number,
    field: "label" | "href",
    value: string,
  ) => {
    const popup = getNGOHeaderPopupData();
    const links = [...(popup.socialLinkspopup ?? [])];
    links[index] = { ...(links[index] ?? {}), [field]: value };
    updateNGOHeaderPopupData({
      ...popup,
      socialLinkspopup: links,
    });
  };

  const addNGOPopupSocialLink = () => {
    const popup = getNGOHeaderPopupData();
    const links = [...(popup.socialLinkspopup ?? [])];
    if (links.length >= 6) return;
    links.push({ label: "facebook", href: "#" });
    updateNGOHeaderPopupData({
      ...popup,
      socialLinkspopup: links,
    });
  };

  const deleteNGOPopupSocialLink = (index: number) => {
    const popup = getNGOHeaderPopupData();
    updateNGOHeaderPopupData({
      ...popup,
      socialLinkspopup: (popup.socialLinkspopup ?? []).filter(
        (_, linkIndex) => linkIndex !== index,
      ),
    });
  };

  const confirmPendingNGOPopupSocialLinkDelete = () => {
    if (pendingNGOPopupSocialLinkDelete === null) return;
    deleteNGOPopupSocialLink(pendingNGOPopupSocialLinkDelete.index);
    setPendingNGOPopupSocialLinkDelete(null);
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
      updateBannerSlideFields(index, {
        image: dataUrl,
        alt: file.name,
      });
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
      updateBannerSlideFields(index, {
        video: dataUrl,
        alt: file.name,
      });
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
    field: "label" | "href" | "variant",
    value: string,
  ) => {
    const nextValue = field === "label" ? limitLinkText(value) : value;
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
      { label: "New Button", href: "#" },
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
    updateBannerSlideFields(index, { [field]: value });
  };

  const updateBannerSlideFields = (
    index: number,
    fields: Partial<Omit<BannerSlideData, "button">>,
  ) => {
    const updatedSlides = (activeBannerData?.bannerSlides ?? []).map(
      (slide, slideIndex) =>
        slideIndex === index ? { ...slide, ...fields } : slide,
    );

    updateActiveBannerData({ bannerSlides: updatedSlides });
  };

  const updateBannerSlideButton = (
    index: number,
    field: "label" | "href" | "variant",
    value: string,
  ) => {
    const nextValue = field === "label" ? limitLinkText(value) : value;
    const updatedSlides = (activeBannerData?.bannerSlides ?? []).map(
      (slide, slideIndex) => {
        if (slideIndex !== index) return slide;

        const nextSlide = {
          ...slide,
          button: {
            label: "Learn more",
            href: "#",
            ...slide.button,
            [field]: nextValue,
          },
        };

        if (isNGOSliderBanner) {
          const { ctaButtons: _unusedCtaButtons, ...rest } = nextSlide as typeof nextSlide & {
            ctaButtons?: unknown;
          };
          return rest;
        }

        return nextSlide;
      },
    );

    updateActiveBannerData({ bannerSlides: updatedSlides });
  };

  const updateBannerSlideSecondButton = (
    index: number,
    field: "label" | "href" | "variant",
    value: string,
  ) => {
    const nextValue = field === "label" ? limitLinkText(value) : value;
    const fallbackButton = activeBannerData?.buttons?.[1];
    const updatedSlides = (activeBannerData?.bannerSlides ?? []).map(
      (slide, slideIndex) => {
        if (slideIndex !== index) return slide;

        const nextSlide = {
          ...slide,
          secondButton: {
            label: fallbackButton?.label ?? "Learn more",
            href: fallbackButton?.href ?? "#",
            variant: fallbackButton?.variant ?? "secondary",
            ...slide.secondButton,
            [field]: nextValue,
          },
        };

        if (isNGOSliderBanner) {
          const { ctaButtons: _unusedCtaButtons, ...rest } = nextSlide as typeof nextSlide & {
            ctaButtons?: unknown;
          };
          return rest;
        }

        return nextSlide;
      },
    );

    updateActiveBannerData({ bannerSlides: updatedSlides });
  };

  const addBannerSlide = () => {
    const currentSlides = activeBannerData?.bannerSlides ?? [];
    const nextIndex = currentSlides.length + 1;
    const firstSlide = currentSlides[0];
    const categoryImage =
      firstSlide?.image ?? activeBannerData?.backgroundImage ?? "/bg1.jpg";
    const categoryVideo =
      firstSlide?.video ?? activeBannerData?.backgroundVideo ?? "/video.mp4";
    const updatedSlides = [
      ...currentSlides,
      {
        image: categoryImage,
        ...(isVideoSliderBanner ? { video: categoryVideo } : {}),
        alt: `Banner slide ${nextIndex}`,
        pretitle: isTemplateSliderBanner ? "New slide pretitle" : undefined,
        title: "New banner slide",
        desc: "Update this slide text from Banner Content.",
        button: {
          label: firstSlide?.button?.label ?? "Learn more",
          href: firstSlide?.button?.href ?? "#",
          variant: (firstSlide?.button?.variant ?? "primary") as ButtonData["variant"],
        },
        ...(isTemplateSliderBanner
          ? {
              secondButton: {
                label:
                  firstSlide?.secondButton?.label ??
                  activeBannerData?.buttons?.[1]?.label ??
                  "View more",
                href:
                  firstSlide?.secondButton?.href ??
                  activeBannerData?.buttons?.[1]?.href ??
                  "#",
                variant: (firstSlide?.secondButton?.variant ??
                  activeBannerData?.buttons?.[1]?.variant ??
                  "secondary") as ButtonData["variant"],
              },
            }
          : {}),
      },
    ];

    updateActiveBannerData({ bannerSlides: updatedSlides });
  };

  const deleteBannerSlide = (index: number) => {
    const slides = activeBannerData?.bannerSlides ?? [];
    const updatedSlides = slides.filter((_, slideIndex) => slideIndex !== index);

    // Keep at least one slide in the editor; removing the last one hides the Banner section.
    if (slides.length <= 1) {
      onDeleteSection?.();
      onClose();
      return;
    }

    updateActiveBannerData({ bannerSlides: updatedSlides });
  };

  const confirmPendingBannerSlideDelete = () => {
    if (pendingBannerSlideDelete === null) return;

    deleteBannerSlide(pendingBannerSlideDelete.index);
    setPendingBannerSlideDelete(null);
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

  const updateFooterLogoType = (logoType: "image" | "text" | "image-text") => {
    updateActiveFooterData({ logoType });
  };

  const updateFooterColumn = (columnIndex: number, field: "title", value: string) => {
    const columns = [...(activeFooterData?.footerColumns ?? [])];
    columns[columnIndex] = { ...columns[columnIndex], [field]: value };
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

  const addFooterLink = (columnIndex: number) => {
    const columns = [...(activeFooterData?.footerColumns ?? [])];
    const column = columns[columnIndex];
    if (!column || column.links.length >= MAX_FOOTER_LINKS_PER_COLUMN) return;
    columns[columnIndex] = { ...column, links: [...column.links, { label: "New link", href: "#" }] };
    updateActiveFooterData({ footerColumns: columns });
  };

  const addFooterColumn = () => {
    updateActiveFooterData({
      footerColumns: [
        ...(activeFooterData?.footerColumns ?? []),
        {
          title: "New column",
          links: [
            {
              label: "New link",
              href: "#",
            },
          ],
        },
      ],
    });
  };

  const renderFooterLinkColumnEditor = (
    column: { title: string; links: { label: string; href: string }[] },
    columnIndex: number,
  ) => (
    <section
      key={`footerColumn-${columnIndex}`}
      className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-gray-900">
          Link column {columnIndex + 1}
        </h3>

        <button
          type="button"
          aria-label={`Delete ${column.title || `link column ${columnIndex + 1}`}`}
          onClick={() =>
            setPendingFooterSectionDelete({
              kind: "column",
              label: column.title || `Link column ${columnIndex + 1}`,
              index: columnIndex,
            })
          }
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
        >
          <Trash size={14} />
        </button>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-600">
          Column title
        </label>

        <input
          value={column.title}
          onChange={(event) =>
            updateFooterColumn(columnIndex, "title", event.target.value)
          }
          className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-blue-600"
          placeholder="Column title"
        />
      </div>

      <div className="space-y-3">
        {column.links.map((link, linkIndex) => (
          <div
            key={`${columnIndex}-${linkIndex}`}
            className="grid gap-3 rounded-xl border border-gray-200 bg-[#f8f8f8] p-3 sm:grid-cols-[1fr_1fr_auto]"
          >
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                Label
              </label>

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
                className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-blue-600"
                placeholder="Link label"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                Link
              </label>

              <input
                value={link.href}
                onChange={(event) =>
                  updateFooterLink(
                    columnIndex,
                    linkIndex,
                    "href",
                    event.target.value,
                  )
                }
                className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-blue-600"
                placeholder="/page"
              />
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => removeFooterLink(columnIndex, linkIndex)}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                aria-label="Delete footer link"
              >
                <Trash size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => addFooterLink(columnIndex)}
        disabled={column.links.length >= MAX_FOOTER_LINKS_PER_COLUMN}
        className="flex items-center gap-2 rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Plus size={14} />
        Add Link
      </button>
    </section>
  );

  const removeFooterLink = (columnIndex: number, linkIndex: number) => {
    const columns = [...(activeFooterData?.footerColumns ?? [])];
    const column = columns[columnIndex];
    if (!column) return;
    columns[columnIndex] = { ...column, links: column.links.filter((_, index) => index !== linkIndex) };
    updateActiveFooterData({ footerColumns: columns });
  };

  const updateFooterLegalLink = (
    index: number,
    field: "label" | "href",
    value: string,
  ) => {
    const links = [...(activeFooterData?.footerLegalLinks ?? [])];

    links[index] = {
      ...links[index],
      [field]: value,
    };

    updateActiveFooterData({
      footerLegalLinks: links,
    });
  };

  const addFooterLegalLink = () => {
    updateActiveFooterData({
      footerLegalLinks: [
        ...(activeFooterData?.footerLegalLinks ?? []),
        {
          label: "New legal link",
          href: "#",
        },
      ],
    });
  };

  const removeFooterLegalLink = (index: number) => {
    updateActiveFooterData({
      footerLegalLinks: (activeFooterData?.footerLegalLinks ?? []).filter(
        (_, linkIndex) => linkIndex !== index,
      ),
    });
  };

  const updateFooterSocialLink = (
    index: number,
    field: "label" | "href",
    value: string,
  ) => {
    const links = [
      ...(activeFooterData?.socialLinks ??
        activeFooterData?.footerSocialLinks ??
        []),
    ];

    links[index] = {
      ...links[index],
      [field]:
        field === "label"
          ? (value as SocialLinkData["label"])
          : value,
    };

    updateActiveFooterData(
      isEventsFooter
        ? { footerSocialLinks: links, socialLinks: links }
        : { socialLinks: links },
    );
  };

  const addFooterSocialLink = () => {
    const links =
      activeFooterData?.socialLinks ??
      activeFooterData?.footerSocialLinks ??
      [];

    // Maximum 7 social links
    if (links.length >= MAX_FOOTER_SOCIAL_LINKS) {
      return;
    }

    const nextLinks = [
      ...links,
      {
        label: "facebook" as SocialLinkData["label"],
        href: "#",
      },
    ];

    updateActiveFooterData(
      isEventsFooter
        ? { footerSocialLinks: nextLinks, socialLinks: nextLinks }
        : { socialLinks: nextLinks },
    );
  };

  const removeFooterSocialLink = (index: number) => {
    const links =
      activeFooterData?.socialLinks ??
      activeFooterData?.footerSocialLinks ??
      [];

    const nextLinks = links.filter(
      (_, socialIndex) => socialIndex !== index,
    );

    updateActiveFooterData(
      isEventsFooter
        ? { footerSocialLinks: nextLinks, socialLinks: nextLinks }
        : { socialLinks: nextLinks },
    );
  };

  const deleteFooterSection = () => {
    if (!pendingFooterSectionDelete) return;

    if (pendingFooterSectionDelete.kind === "column") {
      const columns = [...(activeFooterData?.footerColumns ?? [])];
      const columnIndex = pendingFooterSectionDelete.index;
      if (
        typeof columnIndex !== "number" ||
        columnIndex < 0 ||
        columnIndex >= columns.length
      ) {
        setPendingFooterSectionDelete(null);
        return;
      }
      columns.splice(columnIndex, 1);
      updateActiveFooterData({ footerColumns: columns });
    } else if (pendingFooterSectionDelete.kind === "logo") {
      updateActiveFooterData({
        logo: "",
        logoImage: "",
        logoImageTitle: "",
        logoType: undefined,
        desc: "",
      });
    } else if (pendingFooterSectionDelete.kind === "contact") {
      updateActiveFooterData({
        contactLabel: undefined,
        officeLabel: undefined,
        footerContact: undefined,
      });
    } else if (pendingFooterSectionDelete.kind === "disclaimer") {
      updateActiveFooterData({
        disclaimerTitle: undefined,
        disclaimerText: undefined,
      });
    } else {
      updateActiveFooterData({
        copyrightText: undefined,
        legalTitle: undefined,
        footerLegalLinks: undefined,
        socialLinks: undefined,
        footerSocialLinks: undefined,
      });
    }

    setPendingFooterSectionDelete(null);
  };

  const updateFooterExternalLink = (
    field: "whatsappLink" | "callLink",
    value: string,
  ) => {
    updateActiveFooterData({ [field]: value });
  };

  const addDropdownItem = (menuIndex: number) => {
    const currentDropdowns = menuItems[menuIndex]?.children ?? [];

    if (currentDropdowns.length >= MAX_DROPDOWN_LINKS) return;

    const updatedMenu = menuItems.map((item, itemIndex) =>
      itemIndex === menuIndex
        ? {
          ...item,
          children: [
            ...(item.children ?? []),
            { label: "Dropdown Item", href: "" },
          ],
        }
        : item,
    );

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

    updateActiveHeaderData({ menu: updatedMenu });
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

  const moveMenuItem = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;

    const updatedMenu = [...menuItems];
    const [movedItem] = updatedMenu.splice(fromIndex, 1);
    updatedMenu.splice(toIndex, 0, movedItem);

    updateActiveHeaderData({ menu: updatedMenu });
  };

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[10050]"
      onPointerUp={handleModalPointerUp}
      onPointerCancel={handleModalPointerUp}
    >
      <div
        className={`pointer-events-auto fixed h-[min(74vh,490px)] w-[min(calc(100vw-2rem),980px)] cursor-grab flex-col overflow-hidden rounded-3xl bg-[#f4f4f5] shadow-2xl animate-editor-pop active:cursor-grabbing ${generationText ? "hidden" : "flex"
          }`}
        style={{
          left: `calc((100vw - min(calc(100vw - 2rem), 880px)) / 2 + ${modalPosition.x}px)`,
          top: `calc(20vh + ${modalPosition.y}px)`,
          touchAction: dragStart ? "none" : "auto",
        }}
        onPointerDown={handleModalPointerDown}
      >
        <div
          className={`relative flex items-center justify-between border-b border-gray-400 px-5 py-3 ${dragStart ? "cursor-grabbing" : "cursor-grab"
            }`}
        >
          <h3 className="text-2xl font-medium">
            {subsectionScope?.label ?? formatSectionTitle(sectionType)}
          </h3>

          <button
            type="button"
            onClick={() => setMobileSidebarOpen((open) => !open)}
            className="rounded-md p-2 text-gray-950 lg:hidden"
            aria-label={
              mobileSidebarOpen ? "Close settings menu" : "Open settings menu"
            }
            aria-expanded={mobileSidebarOpen}
          >
            {mobileSidebarOpen ? <X size={26} /> : <Menu size={26} />}
          </button>
        </div>

        <div className="relative flex min-h-0 flex-1">
          {mobileSidebarOpen && (
            <aside className="absolute inset-y-0 left-0 z-30 flex w-56 flex-col rounded-r-2xl border-r border-gray-400 bg-white p-3 shadow-xl lg:hidden">
              <div className="mb-2 flex items-center justify-between underline">
                <h3 className="text-sm font-semibold">
                  Settings
                </h3>
              </div>

              <SidebarContent
                items={visibleSidebarItems}
                activeTab={activeTab}
                setActiveTab={handleSidebarTabChange}
              />
            </aside>
          )}

          <aside className="hidden h-full min-h-0 w-56 shrink-0 flex-col border-r border-gray-400 bg-white p-3 lg:flex">
            <div className="mb-2 flex items-center justify-between underline">
              <h3 className="text-sm font-semibold">
                Settings
              </h3>
            </div>

            <SidebarContent
              items={visibleSidebarItems}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
            />
          </aside>

          <main className="min-w-0 flex-1 overflow-y-auto px-4 py-3 sm:px-5">
            {!usesSectionColorPanel && (
              <div className="mb-3 flex flex-col items-start justify-between gap-4 border-b border-gray-200 pb-2 sm:flex-row">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    {activeTab}
                  </h3>
                  <p className="mt-1 text-xs text-gray-500">
                    Customize {activeTab.toLowerCase()} settings
                  </p>
                </div>

                {false &&
                  activeSectionType === "Header" &&
                  activeTab === "Header Layout" && (
                    <div className="relative flex w-full flex-wrap items-center gap-3 sm:w-auto sm:shrink-0 sm:gap-5">
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
                            className={`min-w-24 rounded-lg border px-5 py-1.5 text-sm font-semibold capitalize text-gray-950 transition ${isActive
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
                            className={`min-w-24 rounded-lg border px-5 py-1.5 text-sm font-semibold capitalize text-gray-950 transition ${isActive
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
              activeTab === "Topbar Layout" && (
                <div className="space-y-4">
                  <SectionColorPanel
                    title="Topbar Layout"
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

                  {sectionLayoutOptions.map((layout) => {
                    const isActive = currentSection?.variant === layout.id;

                    return (
                      <button
                        key={layout.id}
                        type="button"
                        onClick={() => selectSectionVariant(layout.id)}
                        className={`relative w-full overflow-hidden rounded-2xl border bg-white text-left ${isActive ? "border-gray-400" : "border-gray-200"
                          }`}
                      >
                        <SelectedLayoutBadge active={isActive} title={layout.name} />
                        <div
                          className="flex h-20 items-center justify-between px-5"
                          style={{
                            background: topbarPreviewBackground,
                            color: topbarTextColor,
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
                  {category !== "NGO" ? (
                    <div className="rounded-xl border border-gray-200 bg-white p-4">
                      <div className="flex items-center justify-between gap-3">
                        <label className="block text-sm font-semibold text-gray-900">Topbar Text</label>
                        <VisibilityButton hidden={isTopbarFieldHidden("text")} onClick={() => toggleTopbarFieldVisibility("text")} />
                      </div>
                      <input
                        value={activeTopbarData?.text?.[0] ?? ""}
                        onChange={(event) => updateTopbarText(event.target.value)}
                        className="mt-2 h-11 w-full rounded-lg border border-gray-300 px-4 text-sm text-gray-900 outline-none focus:border-blue-600"
                        placeholder="Enter topbar text"
                      />
                    </div>
                  ) : null}

                  <div className={`grid gap-4 ${category === "NGO" ? "lg:grid-cols-2" : "lg:grid-cols-3"}`}>
                    {(category === "NGO"
                      ? (["phone", "location"] as const)
                      : (["phone", "email", "location"] as const)
                    ).map((field) => (
                      <div
                        key={field}
                        className="rounded-xl border border-gray-200 bg-white p-4"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <label className="block text-sm font-semibold capitalize text-gray-900">
                            {field === "location" && category === "NGO"
                              ? "Address"
                              : field}
                          </label>
                          <VisibilityButton hidden={isTopbarFieldHidden(field)} onClick={() => toggleTopbarFieldVisibility(field)} />
                        </div>
                        <input
                          value={
                            field === "location" && category === "NGO"
                              ? (activeTopbarData?.address as string | undefined) ??
                                activeTopbarData?.location ??
                                ""
                              : activeTopbarData?.[field] ?? ""
                          }
                          onChange={(event) =>
                            updateTopbarField(field, event.target.value)
                          }
                          className="mt-2 h-11 w-full rounded-lg border border-gray-300 px-4 text-sm text-gray-900 outline-none focus:border-blue-600"
                          placeholder={`Enter ${field === "location" && category === "NGO" ? "address" : field}`}
                        />
                      </div>
                    ))}
                  </div>

                  {category === "NGO" ? (
                    <div className="rounded-xl border border-gray-200 bg-white p-4">
                      <div className="flex items-center justify-between gap-3">
                        <h4 className="text-sm font-semibold text-gray-900">
                          Donate Button
                        </h4>
                        <VisibilityButton
                          hidden={isTopbarFieldHidden("headerCta")}
                          onClick={() => toggleTopbarFieldVisibility("headerCta")}
                        />
                      </div>
                      <div className="mt-3 grid gap-3 lg:grid-cols-2">
                        <input
                          value={activeTopbarData?.headerCta?.label ?? ""}
                          onChange={(event) =>
                            updateTopbarCta("label", event.target.value)
                          }
                          className="h-11 w-full rounded-lg border border-gray-300 px-4 text-sm text-gray-900 outline-none focus:border-blue-600"
                          placeholder="Button label"
                        />
                        <input
                          value={activeTopbarData?.headerCta?.href ?? ""}
                          onChange={(event) =>
                            updateTopbarCta("href", event.target.value)
                          }
                          className="h-11 w-full rounded-lg border border-gray-300 px-4 text-sm text-gray-900 outline-none focus:border-blue-600"
                          placeholder="Button link"
                        />
                      </div>
                    </div>
                  ) : null}

                  <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900">
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
                        className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-xs font-medium text-white disabled:cursor-not-allowed disabled:bg-gray-300"
                      >
                        <Plus size={14} />
                        Add Icon
                      </button>
                    </div>
                    <div className="flex justify-end">
                      <VisibilityButton hidden={isTopbarFieldHidden("socialLinks")} onClick={() => toggleTopbarFieldVisibility("socialLinks")} />
                    </div>

                    <div className="space-y-3">
                      {topbarSocialLinks.map((socialLink, index) => (
                        <div
                          key={index}
                          className="grid grid-cols-1 gap-3 rounded-xl border border-gray-300 bg-white p-3 shadow-sm lg:grid-cols-[minmax(8rem,1fr)_minmax(8rem,1fr)_3.5rem]"
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
                            className="h-11 rounded-lg border border-gray-300 px-4 text-sm capitalize outline-none focus:border-blue-600"
                          >
                            {socialLinkLabels.map((socialName) => (
                              <option key={socialName} value={socialName}>
                                {socialName}
                              </option>
                            ))}
                          </select>

                          <input
                            value={socialLink.href}
                            onChange={(event) =>
                              updateTopbarSocialLink(
                                index,
                                "href",
                                event.target.value,
                              )
                            }
                            className="h-11 rounded-lg border border-gray-300 px-4 text-sm outline-none focus:border-blue-600"
                            placeholder="Social link"
                          />

                          <button
                            type="button"
                            onClick={() => deleteTopbarSocialLink(index)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-500 bg-white text-red-600"
                            aria-label="Delete social icon"
                          >
                            <Trash size={18} />
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
                  <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4">
                    <h4 className="text-sm font-bold text-slate-900">
                      {/* Logo */}
                    </h4>

                    <label className="block text-sm font-semibold text-gray-900">
                      Logo Type
                      <select
                        value={resolvedHeaderLogoType}
                        onChange={(event) =>
                          updateHeaderLogoType(
                            event.target.value as
                              | "image"
                              | "text"
                              | "image-text",
                          )
                        }
                        className="mt-1 h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-blue-600"
                      >
                        <option value="image">Image logo</option>
                        <option value="text">Text Logo</option>
                        <option value="image-text">Image + Text logo</option>
                      </select>
                    </label>

                    {showHeaderLogoText && (
                      <>
                        <label className="block text-sm font-semibold text-gray-900">
                          Logo Text
                        </label>
                        <input
                          value={activeHeaderData?.logo ?? ""}
                          onChange={(event) =>
                            updateHeaderLogo(event.target.value)
                          }
                          className="h-11 w-full rounded-lg border border-gray-300 px-4 text-sm text-gray-900 outline-none focus:border-blue-600"
                          placeholder="Enter logo text"
                        />
                      </>
                    )}

                    {showHeaderLogoImage && (
                      <div className="space-y-2">
                        <span className="block text-sm font-semibold text-gray-900">
                          Logo Image
                        </span>
                        <div className="flex flex-wrap items-start gap-3">
                          <label className="flex h-11 min-w-[12rem] flex-1 cursor-pointer items-center justify-between rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-900 transition hover:border-blue-500">
                            <span className="font-medium">
                              {activeHeaderData?.logoImage
                                ? "Change logo image"
                                : "Upload logo image"}
                            </span>
                            <span className="max-w-[45%] truncate text-xs text-slate-500">
                              {getMediaUploadLabel(
                                activeHeaderData?.logoImage ?? "",
                                "image",
                              )}
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={updateHeaderLogoImage}
                              className="sr-only"
                            />
                          </label>
                          <div className="flex h-20 w-32 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-2">
                            {activeHeaderData?.logoImage ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={activeHeaderData.logoImage}
                                alt={
                                  activeHeaderData.logoImageTitle ||
                                  "Logo preview"
                                }
                                className="max-h-full max-w-full object-contain"
                              />
                            ) : (
                              <span className="text-xs font-semibold text-slate-400">
                                No image
                              </span>
                            )}
                          </div>
                        </div>

                        <input
                          value={activeHeaderData?.logoImageTitle ?? ""}
                          onChange={(event) =>
                            updateActiveHeaderData({
                              logoImageTitle: event.target.value,
                            })
                          }
                          className="h-11 w-full rounded-lg border border-gray-300 px-4 text-sm text-gray-900 outline-none focus:border-blue-600"
                          placeholder="Logo image alt text"
                        />
                      </div>
                    )}
                  </div>

                  {isNGOHeader ? (
                    <div className="space-y-4">
                      <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4">
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">
                            About Side Panel
                          </h4>
                          <p className="mt-1 text-xs text-gray-700 underline">
                            Edit the About drawer opened from the header grid
                            icon.
                          </p>
                        </div>
                        <label className="block text-sm font-semibold text-gray-900">
                          About Title
                          <input
                            value={
                              activeHeaderData?.PopupData?.aboutpopup?.title ??
                              ""
                            }
                            onChange={(event) =>
                              updateNGOAboutPopup("title", event.target.value)
                            }
                            className="mt-1 h-11 w-full rounded-lg border border-gray-300 px-4 text-sm outline-none focus:border-blue-600"
                            placeholder="About Us"
                          />
                        </label>
                        <label className="block text-sm font-semibold text-gray-900">
                          About Description
                          <textarea
                            value={
                              activeHeaderData?.PopupData?.aboutpopup?.desc ??
                              ""
                            }
                            onChange={(event) =>
                              updateNGOAboutPopup("desc", event.target.value)
                            }
                            rows={4}
                            className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-600"
                            placeholder="About description"
                          />
                        </label>
                      </div>

                      <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <h4 className="text-sm font-bold text-slate-900">
                              Instagram Gallery
                            </h4>
                            <p className="mt-1 text-xs text-gray-500">
                              Up to 8 images in the side panel.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={addNGOInstagramImage}
                            disabled={
                              (activeHeaderData?.PopupData?.instagram?.images ??
                                []).length >= 8
                            }
                            className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-xs font-medium text-white disabled:cursor-not-allowed disabled:bg-gray-300"
                          >
                            <Plus size={14} />
                            Add Image
                          </button>
                        </div>
                        <label className="block text-sm font-semibold text-gray-900">
                          Section Title
                          <input
                            value={
                              activeHeaderData?.PopupData?.instagram?.title ??
                              ""
                            }
                            onChange={(event) =>
                              updateNGOInstagramPopup(
                                "title",
                                event.target.value,
                              )
                            }
                            className="mt-1 h-11 w-full rounded-lg border border-gray-300 px-4 text-sm outline-none focus:border-blue-600"
                            placeholder="Instagram"
                          />
                        </label>
                        <div className="space-y-3">
                          {(
                            activeHeaderData?.PopupData?.instagram?.images ?? []
                          ).map((image, index) => (
                            <div
                              key={index}
                              className="space-y-3 rounded-xl border border-gray-300 bg-white p-3 shadow-sm"
                            >
                              <div className="flex flex-wrap items-start gap-3">
                                <label className="flex h-11 min-w-[12rem] flex-1 cursor-pointer items-center justify-between rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-900 transition hover:border-blue-500">
                                  <span className="font-medium">
                                    {image.src
                                      ? "Change image"
                                      : "Upload image"}
                                  </span>
                                  <span className="max-w-[45%] truncate text-xs text-slate-500">
                                    {getMediaUploadLabel(
                                      image.src ?? "",
                                      "image",
                                    )}
                                  </span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(event) =>
                                      uploadNGOInstagramImage(index, event)
                                    }
                                    className="sr-only"
                                  />
                                </label>
                                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                                  {image.src ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={image.src}
                                      alt={image.alt || "Gallery preview"}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <span className="text-[10px] font-semibold text-slate-400">
                                      No image
                                    </span>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPendingNGOInstagramImageDelete({
                                      index,
                                      label:
                                        image.alt?.trim() ||
                                        `Image ${index + 1}`,
                                    })
                                  }
                                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-500 bg-white text-red-600"
                                  aria-label="Delete gallery image"
                                >
                                  <Trash size={18} />
                                </button>
                              </div>
                              <input
                                value={image.alt ?? ""}
                                onChange={(event) =>
                                  updateNGOInstagramImage(
                                    index,
                                    "alt",
                                    event.target.value,
                                  )
                                }
                                className="h-11 w-full rounded-lg border border-gray-300 px-4 text-sm outline-none focus:border-blue-600"
                                placeholder="Image alt text"
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4">
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">
                            Contact Details
                          </h4>
                          <p className="mt-1 text-xs text-gray-500">
                            Phone and email shown in the About side panel.
                          </p>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="block text-sm font-semibold text-gray-900">
                            Phone
                            <input
                              value={
                                activeHeaderData?.PopupData?.contactpopup
                                  ?.phone ?? ""
                              }
                              onChange={(event) =>
                                updateNGOContactPopup(
                                  "phone",
                                  event.target.value,
                                )
                              }
                              className="mt-1 h-11 w-full rounded-lg border border-gray-300 px-4 text-sm outline-none focus:border-blue-600"
                              placeholder="+088 130 629 8615"
                            />
                          </label>
                          <label className="block text-sm font-semibold text-gray-900">
                            Email
                            <input
                              value={
                                activeHeaderData?.PopupData?.contactpopup
                                  ?.email ?? ""
                              }
                              onChange={(event) =>
                                updateNGOContactPopup(
                                  "email",
                                  event.target.value,
                                )
                              }
                              className="mt-1 h-11 w-full rounded-lg border border-gray-300 px-4 text-sm outline-none focus:border-blue-600"
                              placeholder="huruma@gmail.com"
                            />
                          </label>
                        </div>
                        <label className="block text-sm font-semibold text-gray-900">
                          Separator Text
                          <input
                            value={
                              activeHeaderData?.PopupData?.contactpopup
                                ?.separator ?? ""
                            }
                            onChange={(event) =>
                              updateNGOContactPopup(
                                "separator",
                                event.target.value,
                              )
                            }
                            className="mt-1 h-11 w-full rounded-lg border border-gray-300 px-4 text-sm outline-none focus:border-blue-600"
                            placeholder="or"
                          />
                        </label>
                      </div>

                      <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <h4 className="text-sm font-bold text-slate-900">
                              Social Icons
                            </h4>
                            <p className="mt-1 text-xs text-gray-500">
                              Icons at the bottom of the About side panel.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={addNGOPopupSocialLink}
                            disabled={
                              (activeHeaderData?.PopupData?.socialLinkspopup ??
                                []).length >= 6
                            }
                            className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-xs font-medium text-white disabled:cursor-not-allowed disabled:bg-gray-300"
                          >
                            <Plus size={14} />
                            Add Icon
                          </button>
                        </div>
                        <div className="space-y-3">
                          {(
                            activeHeaderData?.PopupData?.socialLinkspopup ?? []
                          ).map((socialLink, index) => (
                            <div
                              key={index}
                              className="grid grid-cols-1 gap-3 rounded-xl border border-gray-300 bg-white p-3 shadow-sm lg:grid-cols-[minmax(8rem,1fr)_minmax(8rem,1fr)_3.5rem]"
                            >
                              <select
                                value={socialLink.label ?? "facebook"}
                                onChange={(event) =>
                                  updateNGOPopupSocialLink(
                                    index,
                                    "label",
                                    event.target.value,
                                  )
                                }
                                className="h-11 rounded-lg border border-gray-300 px-4 text-sm capitalize outline-none focus:border-blue-600"
                              >
                                {socialLinkLabels.map((socialName) => (
                                  <option key={socialName} value={socialName}>
                                    {socialName}
                                  </option>
                                ))}
                              </select>
                              <input
                                value={socialLink.href ?? ""}
                                onChange={(event) =>
                                  updateNGOPopupSocialLink(
                                    index,
                                    "href",
                                    event.target.value,
                                  )
                                }
                                className="h-11 rounded-lg border border-gray-300 px-4 text-sm outline-none focus:border-blue-600"
                                placeholder="Social link"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setPendingNGOPopupSocialLinkDelete({
                                    index,
                                    label:
                                      socialLink.label?.trim() ||
                                      `Social icon ${index + 1}`,
                                  })
                                }
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-500 bg-white text-red-600"
                                aria-label="Delete social icon"
                              >
                                <Trash size={18} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4">
                      {isSingleCtaHeader ? (
                        <>
                          <div>
                            <h4 className="text-sm font-bold text-slate-900">
                              Header Button
                            </h4>
                            <p className="mt-1 text-xs text-gray-700 underline">
                              Edit the Book Now CTA shown in the header.
                            </p>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <label className="block text-sm font-semibold text-gray-900">
                              Button Label
                              <input
                                value={activeHeaderData?.button?.label ?? ""}
                                onChange={(event) =>
                                  updateEventsHeaderCta(
                                    "label",
                                    event.target.value,
                                  )
                                }
                                className="mt-1 h-11 w-full rounded-lg border border-gray-300 px-4 text-sm outline-none focus:border-blue-600"
                                placeholder="Book Now"
                              />
                            </label>
                            <label className="block text-sm font-semibold text-gray-900">
                              Button Link
                              <input
                                value={activeHeaderData?.button?.href ?? ""}
                                onChange={(event) =>
                                  updateEventsHeaderCta(
                                    "href",
                                    event.target.value,
                                  )
                                }
                                className="mt-1 h-11 w-full rounded-lg border border-gray-300 px-4 text-sm outline-none focus:border-blue-600"
                                placeholder="/contact"
                              />
                            </label>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="text-sm font-bold text-slate-900">
                                Header Buttons
                              </h4>
                              <p className="mt-1 text-xs text-gray-700 underline">
                                Manage header action buttons.
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={addHeaderButton}
                              disabled={
                                (activeHeaderData?.buttons ?? []).length >=
                                MAX_HEADER_BUTTONS
                              }
                              className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-xs font-medium text-white disabled:cursor-not-allowed disabled:bg-gray-300"
                            >
                              <Plus size={14} />
                              Add Button
                            </button>
                          </div>

                          <p className="text-xs text-gray-500">
                            {(activeHeaderData?.buttons ?? []).length}/
                            {MAX_HEADER_BUTTONS} header buttons added
                          </p>

                          <div className="space-y-3">
                            {(activeHeaderData?.buttons ?? []).map(
                              (button, index) => (
                                <div
                                  key={index}
                                  className="grid grid-cols-1 gap-3 rounded-xl border border-gray-300 bg-white p-3 shadow-sm lg:grid-cols-[minmax(8rem,1fr)_minmax(8rem,1fr)_8rem_3.5rem]"
                                >
                                  <input
                                    value={button.label}
                                    onChange={(event) =>
                                      updateHeaderButton(
                                        index,
                                        "label",
                                        event.target.value,
                                      )
                                    }
                                    className="h-11 rounded-lg border border-gray-300 px-4 text-sm outline-none focus:border-blue-600"
                                    placeholder="Button label"
                                  />

                                  <input
                                    value={button.href}
                                    onChange={(event) =>
                                      updateHeaderButton(
                                        index,
                                        "href",
                                        event.target.value,
                                      )
                                    }
                                    className="h-11 rounded-lg border border-gray-300 px-4 text-sm outline-none focus:border-blue-600"
                                    placeholder="/link"
                                  />

                                  <select
                                    value={button.variant ?? "primary"}
                                    onChange={(event) =>
                                      updateHeaderButton(
                                        index,
                                        "variant",
                                        event.target.value,
                                      )
                                    }
                                    className="h-11 rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-blue-600"
                                    aria-label="Header button style"
                                  >
                                    <option value="primary">Primary</option>
                                    <option value="secondary">Secondary</option>
                                  </select>

                                  <button
                                    type="button"
                                    onClick={() => deleteHeaderButton(index)}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-500 bg-white text-red-600"
                                    aria-label="Delete header button"
                                  >
                                    <Trash size={18} />
                                  </button>
                                </div>
                              ),
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

            {activeSectionType === "Header" &&
              activeTab === "Header Layout" && (
                <div className="space-y-4">
                  <SectionColorPanel
                    title="Header Layout"
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
                  />

                  {sectionLayoutOptions.map((layout) => {
                    const isActive = currentSection?.variant === layout.id;

                    return (
                      <button
                        key={layout.id}
                        type="button"
                        onClick={() => selectSectionVariant(layout.id)}
                        className={`relative w-full overflow-hidden rounded-2xl border bg-white text-left ${isActive ? "border-gray-400" : "border-gray-200"
                          }`}
                      >
                        <SelectedLayoutBadge active={isActive} title={layout.name} />
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

                          {layout.id !== "Header-1" &&
                            layout.id !== "Header-2" && (
                              <div
                                className="flex h-full items-center justify-between px-4"
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
                    ref={bannerImageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleBannerImageFileChange}
                    className="hidden"
                    aria-label="Choose banner image"
                  />
                  <input
                    ref={bannerVideoInputRef}
                    type="file"
                    accept="video/*"
                    onChange={handleBannerVideoFileChange}
                    className="hidden"
                    aria-label="Choose banner video"
                  />

                  {"pretitle" in (activeBannerData ?? {}) &&
                    !isTemplateSliderBanner && (
                    <div className="rounded-xl border border-gray-200 bg-white p-4">
                      <label className="block text-sm font-semibold text-gray-900">
                        Pretitle
                      </label>
                      <input
                        value={activeBannerData?.pretitle ?? ""}
                        onChange={(event) =>
                          updateBannerField("pretitle", event.target.value)
                        }
                        className="mt-2 h-11 w-full rounded-lg border border-gray-300 px-4 text-sm text-gray-900 outline-none focus:border-blue-600"
                        placeholder="Enter banner pretitle"
                      />
                    </div>
                  )}

                  {!isSliderBanner && "title" in (activeBannerData ?? {}) && (
                    <div className="rounded-xl border border-gray-200 bg-white p-4">
                      <label className="block text-sm font-semibold text-gray-900">
                        Title
                      </label>
                      <input
                        value={activeBannerData?.title ?? ""}
                        onChange={(event) =>
                          updateBannerField("title", event.target.value)
                        }
                        className="mt-2 h-11 w-full rounded-lg border border-gray-300 px-4 text-sm text-gray-900 outline-none focus:border-blue-600"
                        placeholder="Enter banner title"
                      />
                    </div>
                  )}

                  {!isSliderBanner && "desc" in (activeBannerData ?? {}) && (
                    <div className="rounded-xl border border-gray-200 bg-white p-4">
                      <label className="block text-sm font-semibold text-gray-900">
                        Description
                      </label>
                      <textarea
                        value={activeBannerData?.desc ?? ""}
                        onChange={(event) =>
                          updateBannerField("desc", event.target.value)
                        }
                        className="mt-2 min-h-28 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none focus:border-blue-600"
                        placeholder="Enter banner description"
                      />
                    </div>
                  )}

                  {activeVariant === "Banner-2" &&
                    "overlayColor" in (activeBannerData ?? {}) && (
                      <div className="rounded-xl border border-gray-200 bg-white p-4">
                        <ColorInput
                          label="Overlay Color"
                          value={activeBannerData?.overlayColor ?? "#000000"}
                          onChange={(color) =>
                            updateBannerField("overlayColor", color)
                          }
                        />
                      </div>
                    )}

                  {isSliderBanner && hasBannerSlidesField && (
                    <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-4">
                      <div className="flex items-center justify-between gap-3">
                        <h4 className="text-sm font-semibold text-gray-900">
                          Banner Slider (
                          {(activeBannerData?.bannerSlides ?? []).length})
                        </h4>
                        <button
                          type="button"
                          onClick={addBannerSlide}
                          className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-xs font-medium text-white"
                        >
                          <Plus size={14} />
                          Add Slide
                        </button>
                      </div>

                      {(activeBannerData?.bannerSlides ?? []).map(
                        (slide, index) => (
                          <div
                            key={index}
                            className="space-y-3 rounded-xl border border-gray-300 bg-white p-3 shadow-sm"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <h5 className="text-sm font-semibold text-gray-900">
                                Slide {index + 1}
                              </h5>
                              <button
                                type="button"
                                onClick={() =>
                                  setPendingBannerSlideDelete({
                                    index,
                                    label:
                                      slide.title?.trim() ||
                                      `Slide ${index + 1}`,
                                  })
                                }
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-500 bg-white text-red-600"
                                aria-label="Delete banner slide"
                              >
                                <Trash size={18} />
                              </button>
                            </div>

                            {!isVideoSliderBanner && (
                              <div>
                                <label className="block text-sm font-semibold text-gray-900">
                                  Slide Image
                                </label>
                                <div className="mt-2 grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem] sm:items-center">
                                  <label className="flex h-11 w-full cursor-pointer items-center justify-between rounded-lg border border-gray-300 bg-white px-4 text-left text-sm text-gray-900 transition hover:border-blue-500 focus-within:border-blue-600">
                                    <span className="font-medium">
                                      {slide.image
                                        ? "Change image"
                                        : "Upload image"}
                                    </span>
                                    <span className="max-w-[55%] truncate text-xs text-gray-500">
                                      {getMediaUploadLabel(slide.image, "image")}
                                    </span>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      onChange={(event) =>
                                        handleBannerSlideImageFileChange(
                                          index,
                                          event,
                                        )
                                      }
                                      className="sr-only"
                                      aria-label={`Choose slide ${index + 1} image`}
                                    />
                                  </label>
                                  <MediaUploadPreview
                                    src={slide.image ?? ""}
                                    type="image"
                                  />
                                </div>
                              </div>
                            )}

                            {isVideoSliderBanner && (
                              <div>
                                <div className="flex items-center justify-between gap-3">
                                  <label className="block text-sm font-semibold text-gray-900">
                                    Slide Video
                                  </label>
                                  {slide.video && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        deleteBannerSlideVideo(index)
                                      }
                                      className="rounded-md border border-red-500 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                                    >
                                      Delete video
                                    </button>
                                  )}
                                </div>
                                <div className="mt-2 grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem] sm:items-center">
                                  <label className="flex h-11 w-full cursor-pointer items-center justify-between rounded-lg border border-gray-300 bg-white px-4 text-left text-sm text-gray-900 transition hover:border-blue-500 focus-within:border-blue-600">
                                    <span className="font-medium">
                                      {slide.video
                                        ? "Change video"
                                        : "Upload video"}
                                    </span>
                                    <span className="max-w-[55%] truncate text-xs text-gray-500">
                                      {getMediaUploadLabel(
                                        slide.video ?? "",
                                        "video",
                                      )}
                                    </span>
                                    <input
                                      type="file"
                                      accept="video/*"
                                      onChange={(event) =>
                                        handleBannerSlideVideoFileChange(
                                          index,
                                          event,
                                        )
                                      }
                                      className="sr-only"
                                      aria-label={`Choose slide ${index + 1} video`}
                                    />
                                  </label>
                                  <MediaUploadPreview
                                    src={slide.video ?? ""}
                                    type="video"
                                  />
                                </div>
                              </div>
                            )}

                            {isVideoSliderBanner && (
                              <div>
                                <span className="block text-sm font-semibold text-gray-900">
                                  Poster Image
                                </span>
                                <div className="mt-2 grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem] sm:items-center">
                                  <label className="flex h-11 w-full cursor-pointer items-center justify-between rounded-lg border border-gray-300 bg-white px-4 text-left text-sm text-gray-900 transition hover:border-blue-500 focus-within:border-blue-600">
                                    <span className="font-medium">
                                      {slide.image ? "Change poster" : "Upload poster"}
                                    </span>
                                    <span className="max-w-[55%] truncate text-xs text-gray-500">
                                      {getMediaUploadLabel(slide.image, "image")}
                                    </span>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      onChange={(event) =>
                                        handleBannerSlideImageFileChange(index, event)
                                      }
                                      className="sr-only"
                                      aria-label={`Choose slide ${index + 1} poster image`}
                                    />
                                  </label>
                                  <MediaUploadPreview
                                    src={slide.image ?? ""}
                                    type="image"
                                  />
                                </div>
                              </div>
                            )}

                            <div>
                              <label className="block text-sm font-semibold text-gray-900">
                                Slide Image Alt Text
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
                                className="mt-2 h-11 w-full rounded-lg border border-gray-300 px-4 text-sm text-gray-900 outline-none focus:border-blue-600"
                                placeholder="Describe this slide image"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-semibold text-gray-900">
                                Slide Pre Title
                              </label>
                              <input
                                value={slide.pretitle ?? ""}
                                onChange={(event) =>
                                  updateBannerSlide(
                                    index,
                                    "pretitle",
                                    event.target.value,
                                  )
                                }
                                className="mt-2 h-11 w-full rounded-lg border border-gray-300 px-4 text-sm text-gray-900 outline-none focus:border-blue-600"
                                placeholder="Enter slide pretitle"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-900">
                                Slide Title
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
                                className="mt-2 h-11 w-full rounded-lg border border-gray-300 px-4 text-sm text-gray-900 outline-none focus:border-blue-600"
                                placeholder="Enter slide title"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-semibold text-gray-900">
                                Slide Description
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
                                className="mt-2 min-h-24 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none focus:border-blue-600"
                                placeholder="Enter slide description"
                              />
                            </div>

                            {(slide.button || isTemplateSliderBanner) && (
                              <div className="space-y-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                  {isTemplateSliderBanner
                                    ? "Primary Button"
                                    : "Button"}
                                </p>
                                <div className="grid gap-3 lg:grid-cols-3">
                                  <div>
                                    <label className="block text-sm font-semibold text-gray-900">
                                      Button Label
                                    </label>
                                    <input
                                      value={slide.button?.label ?? ""}
                                      onChange={(event) =>
                                        updateBannerSlideButton(
                                          index,
                                          "label",
                                          event.target.value,
                                        )
                                      }
                                      className="mt-2 h-11 w-full rounded-lg border border-gray-300 px-4 text-sm text-gray-900 outline-none focus:border-blue-600"
                                      placeholder="Learn more"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-sm font-semibold text-gray-900">
                                      Button Link
                                    </label>
                                    <input
                                      value={slide.button?.href ?? ""}
                                      onChange={(event) =>
                                        updateBannerSlideButton(
                                          index,
                                          "href",
                                          event.target.value,
                                        )
                                      }
                                      className="mt-2 h-11 w-full rounded-lg border border-gray-300 px-4 text-sm text-gray-900 outline-none focus:border-blue-600"
                                      placeholder="#"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-sm font-semibold text-gray-900">
                                      Button Style
                                    </label>
                                    <select
                                      value={slide.button?.variant ?? "primary"}
                                      onChange={(event) =>
                                        updateBannerSlideButton(
                                          index,
                                          "variant",
                                          event.target.value,
                                        )
                                      }
                                      className="mt-2 h-11 w-full rounded-lg border border-gray-300 px-4 text-sm text-gray-900 outline-none focus:border-blue-600"
                                    >
                                      <option value="primary">Primary</option>
                                      <option value="secondary">Secondary</option>
                                    </select>
                                  </div>
                                </div>
                              </div>
                            )}

                            {isTemplateSliderBanner && (
                              <div className="space-y-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                  Secondary Button
                                </p>
                                <div className="grid gap-3 lg:grid-cols-3">
                                  <div>
                                    <label className="block text-sm font-semibold text-gray-900">
                                      Button Label
                                    </label>
                                    <input
                                      value={
                                        slide.secondButton?.label ??
                                        activeBannerData?.buttons?.[1]?.label ??
                                        ""
                                      }
                                      onChange={(event) =>
                                        updateBannerSlideSecondButton(
                                          index,
                                          "label",
                                          event.target.value,
                                        )
                                      }
                                      className="mt-2 h-11 w-full rounded-lg border border-gray-300 px-4 text-sm text-gray-900 outline-none focus:border-blue-600"
                                      placeholder="View more"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-sm font-semibold text-gray-900">
                                      Button Link
                                    </label>
                                    <input
                                      value={
                                        slide.secondButton?.href ??
                                        activeBannerData?.buttons?.[1]?.href ??
                                        ""
                                      }
                                      onChange={(event) =>
                                        updateBannerSlideSecondButton(
                                          index,
                                          "href",
                                          event.target.value,
                                        )
                                      }
                                      className="mt-2 h-11 w-full rounded-lg border border-gray-300 px-4 text-sm text-gray-900 outline-none focus:border-blue-600"
                                      placeholder="#"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-sm font-semibold text-gray-900">
                                      Button Style
                                    </label>
                                    <select
                                      value={
                                        slide.secondButton?.variant ??
                                        activeBannerData?.buttons?.[1]
                                          ?.variant ??
                                        "secondary"
                                      }
                                      onChange={(event) =>
                                        updateBannerSlideSecondButton(
                                          index,
                                          "variant",
                                          event.target.value,
                                        )
                                      }
                                      className="mt-2 h-11 w-full rounded-lg border border-gray-300 px-4 text-sm text-gray-900 outline-none focus:border-blue-600"
                                    >
                                      <option value="primary">Primary</option>
                                      <option value="secondary">Secondary</option>
                                    </select>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ),
                      )}
                    </section>
                  )}

                  {!isSliderBanner && hasBannerMediaField && (
                    <section className="rounded-xl border border-gray-200 bg-white p-4">
                      <h4 className="text-sm font-semibold text-gray-900">
                        Banner Media
                      </h4>

                      {hasBannerImageField && (
                        <div className="mt-4 grid gap-4 lg:grid-cols-2">
                          <div>
                            <label className="block text-sm font-semibold text-gray-900">
                              Background Image
                            </label>
                            <div className="mt-2 grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem] sm:items-center">
                              <button
                                type="button"
                                onClick={() =>
                                  bannerImageInputRef.current?.click()
                                }
                                className="flex h-11 w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-4 text-left text-sm text-gray-900 transition hover:border-blue-500 focus:border-blue-600 focus:outline-none"
                              >
                                <span className="font-medium">
                                  {activeBannerData?.backgroundImage
                                    ? "Change image"
                                    : "Upload image"}
                                </span>
                                <span className="max-w-[55%] truncate text-xs text-gray-500">
                                  {getMediaUploadLabel(
                                    activeBannerData?.backgroundImage ?? "",
                                    "image",
                                  )}
                                </span>
                              </button>
                              <MediaUploadPreview
                                src={activeBannerData?.backgroundImage ?? ""}
                                type="image"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-semibold text-gray-900">
                              Image Alt Text
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
                              className="mt-2 h-11 w-full rounded-lg border border-gray-300 px-4 text-sm text-gray-900 outline-none focus:border-blue-600"
                              placeholder="Banner image"
                            />
                          </div>
                        </div>
                      )}

                      {hasBannerVideoField && (
                        <div className="mt-4">
                          <div className="flex items-center justify-between gap-3">
                            <label className="block text-sm font-semibold text-gray-900">
                              Background Video
                            </label>
                            {activeBannerData?.backgroundVideo && (
                              <button
                                type="button"
                                onClick={() =>
                                  updateBannerField("backgroundVideo", "")
                                }
                                className="rounded-md border border-red-500 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                              >
                                Delete video
                              </button>
                            )}
                          </div>
                          <div className="mt-2 grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem] sm:items-center">
                            <button
                              type="button"
                              onClick={() => bannerVideoInputRef.current?.click()}
                              className="flex h-11 w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-4 text-left text-sm text-gray-900 transition hover:border-blue-500 focus:border-blue-600 focus:outline-none"
                            >
                              <span className="font-medium">
                                {activeBannerData?.backgroundVideo
                                  ? "Change video"
                                  : "Upload video"}
                              </span>
                              <span className="max-w-[55%] truncate text-xs text-gray-500">
                                {getMediaUploadLabel(
                                  activeBannerData?.backgroundVideo ?? "",
                                  "video",
                                )}
                              </span>
                            </button>
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

                  {hasBannerHeightField && !isNGOSliderBanner && (
                    <div className="rounded-xl border border-gray-200 bg-white p-4">
                      <div className="flex items-center justify-between gap-3">
                        <label className="text-sm font-semibold text-gray-900">
                          Banner Height
                        </label>
                        <input
                          type="number"
                          min={40}
                          max={100}
                          value={bannerHeight}
                          onChange={(event) =>
                            updateBannerHeight(Number(event.target.value))
                          }
                          className="h-10 w-24 rounded-lg border border-gray-300 px-3 text-sm text-gray-900 outline-none focus:border-blue-600"
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
                        className="mt-4 w-full accent-blue-600"
                      />
                    </div>
                  )}

                  {hasBannerButtonsField &&
                    (!isSliderBanner || visibleBannerButtons.length > 0) && (
                      <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4">
                        <div className="flex items-center justify-between gap-3">
                          <h4 className="text-sm font-semibold text-gray-900">
                            {isSliderBanner ? "Secondary Banner Button" : "Banner Buttons"}
                          </h4>

                          {!isSliderBanner && <button
                            type="button"
                            onClick={addBannerButton}
                            disabled={
                              (activeBannerData?.buttons ?? []).length >=
                              MAX_BANNER_BUTTONS
                            }
                            className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-xs font-medium text-white disabled:cursor-not-allowed disabled:bg-gray-300"
                          >
                            <Plus size={14} />
                            Add Button
                          </button>}
                        </div>

                        {!isSliderBanner && <p className="text-xs text-gray-500">
                          {(activeBannerData?.buttons ?? []).length}/
                          {MAX_BANNER_BUTTONS} banner buttons added
                        </p>}

                        <div className="space-y-3">
                          {visibleBannerButtons.map(
                            ({ button, index }) => (
                              <div
                                key={index}
                                className="grid grid-cols-1 gap-3 rounded-xl border border-gray-300 bg-white p-3 shadow-sm lg:grid-cols-[minmax(8rem,1fr)_minmax(8rem,1fr)_8rem_3.5rem]"
                              >
                                <input
                                  value={button.label}
                                  onChange={(event) =>
                                    updateBannerButton(
                                      index,
                                      "label",
                                      event.target.value,
                                    )
                                  }
                                  className="h-11 rounded-lg border border-gray-300 px-4 text-sm outline-none focus:border-blue-600"
                                  placeholder="Button label"
                                />

                                <input
                                  value={button.href}
                                  onChange={(event) =>
                                    updateBannerButton(
                                      index,
                                      "href",
                                      event.target.value,
                                    )
                                  }
                                  className="h-11 rounded-lg border border-gray-300 px-4 text-sm outline-none focus:border-blue-600"
                                  placeholder="/link"
                                />

                                <select
                                  value={button.variant ?? "primary"}
                                  onChange={(event) =>
                                    updateBannerButton(
                                      index,
                                      "variant",
                                      event.target.value,
                                    )
                                  }
                                  className="h-11 rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-blue-600"
                                  aria-label="Banner button style"
                                >
                                  <option value="primary">Primary</option>
                                  <option value="secondary">Secondary</option>
                                </select>

                                <button
                                  type="button"
                                  onClick={() => deleteBannerButton(index)}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-500 bg-white text-red-600"
                                  aria-label="Delete banner button"
                                >
                                  <Trash size={18} />
                                </button>
                              </div>
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
                  {sectionLayoutOptions.map((layout) => {
                    const isActive =
                      currentSection?.variant === layout.id ||
                      currentSection?.variant === layout.componentVariant;
                    const Component = getSectionComponent(
                      category,
                      activeSectionType,
                      layout.componentVariant ?? layout.id,
                    );
                    const useEventsBannerLivePreview =
                      category === "Events" && Boolean(Component);
                    const layoutData =
                      currentSection?.data?.[layout.id] ??
                      currentSection?.data?.[layout.componentVariant ?? ""] ??
                      (useEventsBannerLivePreview
                        ? getCategoryVariantData(
                            category,
                            activeSectionType,
                            layout.componentVariant ?? layout.id,
                          )
                        : undefined) ??
                      activeBannerData ??
                      activeGenericData;

                    return (
                      <button
                        key={layout.id}
                        type="button"
                        onClick={() => selectSectionVariant(layout.id)}
                        className={`relative w-full overflow-hidden rounded-2xl border bg-white text-left ${isActive ? "border-gray-400" : "border-gray-200"
                          }`}
                      >
                        <SelectedLayoutBadge active={isActive} title={layout.name} />
                        <div
                          className={`${useEventsBannerLivePreview ? "h-36" : "h-28"} overflow-hidden bg-gray-100`}
                        >
                          {useEventsBannerLivePreview && Component ? (
                            <div className="h-[520px] w-[1200px] origin-top-left scale-[0.32] bg-white">
                              <Component data={layoutData} />
                            </div>
                          ) : (
                            <>
                          {layout.id === "Banner-1" && (
                            <div className="relative flex h-full items-center overflow-hidden bg-slate-900 px-5">
                              <div
                                className="absolute inset-0 bg-cover bg-center"
                                style={{
                                  backgroundImage: `url(${activeBannerData?.backgroundImage ??
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
                                  backgroundImage: `url(${activeBannerData?.bannerSlides?.[0]
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
                            </>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

            {(isEventsInnerSubsectionLayout || isNGOAboutPageLayout) &&
              activeTab.endsWith("Layout") &&
              activeTab !== "Box Layout" && (
              <div className="space-y-4">
                {activeAboutLayouts.map((layout) => {
                  const subsectionComponentVariant =
                    layout.componentVariant ?? layout.id;

                  return (
                    <button
                      key={layout.id}
                      type="button"
                      className="relative w-full overflow-hidden rounded-2xl border border-gray-400 bg-white text-left"
                    >
                      <SelectedLayoutBadge active title={layout.name} />
                      <div className="h-32 bg-gray-100">
                        <div className="h-[520px] w-[1200px] origin-top-left scale-[0.28] bg-white">
                          {isNGOAboutPageLayout ? (
                            <NGOSubsectionLayoutPreview
                              componentVariant={subsectionComponentVariant}
                              data={pageVariantData ?? activeGenericData}
                              subsectionLabel={
                                subsectionScope?.label ?? layout.name
                              }
                            />
                          ) : (
                            <EventsSubsectionLayoutPreview
                              componentVariant={subsectionComponentVariant}
                              data={activeGenericData}
                              subsectionLabel={
                                subsectionScope?.label ?? layout.name
                              }
                            />
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {category === "Events" &&
              isPageSection &&
              !subsectionScope &&
              activeSectionType !== "Contact" &&
              activeTab.endsWith("Layout") &&
              activeTab !== "Box Layout" && (
              <div className="space-y-4">
                {pageLayoutOptions.map((layout) => {
                  const isActive =
                    currentSection?.variant === layout.id ||
                    currentSection?.variant === layout.componentVariant;
                  const Component = getSectionComponent(
                    category,
                    activeSectionType,
                    layout.componentVariant ?? layout.id,
                  );
                  const layoutData =
                    currentSection?.data?.[layout.id] ??
                    currentSection?.data?.[layout.componentVariant ?? ""] ??
                    activeGenericData;
                  const usesGeneratedPagePreview =
                    Boolean(Component) &&
                    String(layout.componentVariant ?? "").includes("Page");

                  return (
                    <button
                      key={layout.id}
                      type="button"
                      onClick={() =>
                        selectSectionVariant(
                          layout.componentVariant ?? layout.id,
                        )
                      }
                      className={`relative w-full overflow-hidden rounded-2xl border bg-white text-left ${isActive ? "border-gray-400" : "border-gray-200"
                        }`}
                    >
                      <SelectedLayoutBadge active={isActive} title={layout.name} />
                      <div className="h-32 bg-gray-100">
                        {usesGeneratedPagePreview && Component && (
                          <div className="h-[520px] w-[1200px] origin-top-left scale-[0.28] bg-white">
                            <Component data={layoutData} />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {(activeSectionType === "About" ||
              (category !== "Events" &&
                (activeSectionType === "AboutPage" ||
                  activeSectionType === "AboutUsPage"))) &&
              !isEventsInnerSubsectionLayout &&
              !isNGOAboutPageLayout &&
              activeTab.endsWith("Layout") &&
              activeTab !== "Box Layout" && (
              <div className="space-y-4">
                {activeAboutLayouts.map((layout) => {
                  const isActive =
                    currentSection?.variant === layout.id ||
                    currentSection?.variant === layout.componentVariant;
                  const Component = getSectionComponent(
                    category,
                    activeSectionType,
                    layout.componentVariant ?? layout.id,
                  );
                  const useEventsAboutLivePreview =
                    category === "Events" &&
                    activeSectionType === "About" &&
                    Boolean(Component);
                  const layoutData =
                    currentSection?.data?.[layout.id] ??
                    currentSection?.data?.[layout.componentVariant ?? ""] ??
                    (useEventsAboutLivePreview
                      ? getCategoryVariantData(
                          category,
                          activeSectionType,
                          layout.componentVariant ?? layout.id,
                        )
                      : undefined) ??
                    activeGenericData;
                  const usesGeneratedPagePreview =
                    isPageSection &&
                    !layout.id.startsWith(`${activeSectionType}Page-`) &&
                    !String(layout.componentVariant ?? "").includes("Page");

                  return (
                    <button
                      key={layout.id}
                      type="button"
                      onClick={() =>
                        selectSectionVariant(
                          layout.componentVariant ?? layout.id,
                        )
                      }
                      className={`relative w-full overflow-hidden rounded-2xl border bg-white text-left ${isActive ? "border-gray-400" : "border-gray-200"
                        }`}
                    >
                      <SelectedLayoutBadge active={isActive} title={layout.name} />
                      <div
                        className={`${useEventsAboutLivePreview ? "h-36" : "h-32"} overflow-hidden bg-gray-100`}
                      >
                        {useEventsAboutLivePreview && Component ? (
                          <div className="h-[520px] w-[1200px] origin-top-left scale-[0.32] bg-white">
                            <Component data={layoutData} />
                          </div>
                        ) : (
                          <>
                        {usesGeneratedPagePreview && Component && (
                          <div className="h-[520px] w-[1200px] origin-top-left scale-[0.28] bg-white">
                            <Component data={layoutData} />
                          </div>
                        )}

                        {(layout.componentVariant === "EventsAboutPage1" ||
                          layout.id === "EventsAboutPage1") && (
                          <div className="grid h-full grid-cols-[1.1fr_0.9fr] gap-3 bg-white p-4">
                            <div className="space-y-2">
                              <div className="h-2 w-20 rounded bg-[#d61b58]" />
                              <div className="h-5 w-full rounded bg-slate-900" />
                              <div className="h-5 w-4/5 rounded bg-slate-900" />
                              <div className="mt-3 h-2 w-full rounded bg-slate-400" />
                              <div className="h-2 w-5/6 rounded bg-slate-400" />
                            </div>
                            <div className="rounded-2xl bg-slate-300" />
                          </div>
                        )}

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
                          </>
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
                  {sectionLayoutOptions.map((layout) => {
                    const isActive = currentSection?.variant === layout.id;

                    return (
                      <button
                        key={layout.id}
                        type="button"
                        onClick={() => selectSectionVariant(layout.id)}
                        className={`relative w-full overflow-hidden rounded-2xl border bg-white text-left ${isActive ? "border-gray-400" : "border-gray-200"
                          }`}
                      >
                        <SelectedLayoutBadge active={isActive} title={layout.name} />
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
                  {sectionLayoutOptions.map((layout) => {
                    const isActive = currentSection?.variant === layout.id;

                    return (
                      <button
                        key={layout.id}
                        type="button"
                        onClick={() => selectSectionVariant(layout.id)}
                        className={`relative w-full overflow-hidden rounded-2xl border bg-white text-left ${isActive ? "border-gray-400" : "border-gray-200"
                          }`}
                      >
                        <SelectedLayoutBadge active={isActive} title={layout.name} />
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
                      </button>
                    );
                  })}
                </div>
              )}

            {activeSectionType === "FormDetail" &&
              activeTab === "Form Content" && (
                <div className="space-y-5">
                  <section className="rounded-xl bg-[#f4f4f5] p-4">
                    <div className="grid gap-3">
                      {isContentFieldVisible("pretitle") && (
                        <input
                          value={activeFormDetailData?.pretitle ?? ""}
                          onChange={(event) =>
                            updateActiveFormDetailData({
                              pretitle: event.target.value,
                            })
                          }
                          className="h-11 rounded-lg border border-gray-300 px-4 text-sm outline-none focus:border-blue-600"
                          placeholder="Eyebrow text"
                        />
                      )}
                      {isContentFieldVisible("title") && (
                        <input
                          value={activeFormDetailData?.title ?? ""}
                          onChange={(event) =>
                            updateActiveFormDetailData({
                              title: event.target.value,
                            })
                          }
                          className="h-11 rounded-lg border border-gray-300 px-4 text-sm outline-none focus:border-blue-600"
                          placeholder="Form title"
                        />
                      )}
                      {isContentFieldVisible("desc") && (
                        <textarea
                          value={activeFormDetailData?.desc ?? ""}
                          onChange={(event) =>
                            updateActiveFormDetailData({
                              desc: event.target.value,
                            })
                          }
                          className="h-24 resize-none rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-600"
                          placeholder="Form description"
                        />
                      )}
                      {isContentFieldVisible("formSubmitLabel") && (
                        <input
                          value={activeFormDetailData?.formSubmitLabel ?? ""}
                          onChange={(event) =>
                            updateActiveFormDetailData({
                              formSubmitLabel: event.target.value,
                            })
                          }
                          className="h-11 rounded-lg border border-gray-300 px-4 text-sm outline-none focus:border-blue-600"
                          placeholder="Submit button label"
                        />
                      )}
                    </div>
                  </section>

                  {(
                    [
                      "backgroundImage",
                      "backgroundImageTitle",
                      "sideImage",
                      "galleryItems",
                      "phone",
                      "email",
                      "location",
                    ] as const
                  )
                    .filter(
                      (fieldName) =>
                        isContentFieldVisible(fieldName) &&
                        activeGenericEditorData &&
                        Object.prototype.hasOwnProperty.call(
                          activeGenericEditorData,
                          fieldName,
                        ),
                    )
                    .map((fieldName) => (
                      <GenericFieldEditor
                        key={fieldName}
                        fieldName={fieldName}
                        value={
                          (
                            activeGenericEditorData as
                            | Record<string, unknown>
                            | undefined
                          )?.[fieldName]
                        }
                        path={[fieldName]}
                        sectionType="FormDetail"
                        onChange={updateGenericField}
                        onMediaChange={updateGenericMedia}
                        onAddArrayItem={addGenericCollectionItem}
                        onDeleteArrayItem={deleteGenericCollectionItem}
                        availablePageNames={availablePageNames}
                      />
                    ))}

                  <section className="rounded-xl bg-[#f4f4f5] p-4">
                    <div className="mb-4 flex items-center justify-between">
                      <h4 className="text-sm font-bold text-slate-900">
                        Form Fields
                      </h4>
                      <button
                        type="button"
                        onClick={addFormField}
                        disabled={
                          (activeFormDetailData?.formFields ?? []).length >=
                          MAX_FORM_FIELDS
                        }
                        className="rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
                      >
                        Add Field
                      </button>
                    </div>
                    <p className="-mt-2 mb-4 text-xs font-medium text-slate-500">
                      {(activeFormDetailData?.formFields ?? []).length}/
                      {MAX_FORM_FIELDS} fields added
                    </p>

                    <div className="space-y-3">
                      {(activeFormDetailData?.formFields ?? []).map(
                        (field, index) => (
                          <div
                            key={`formField-${index}`}
                            className="grid gap-2 rounded-xl bg-white p-3"
                          >
                            <div className="grid gap-2 md:grid-cols-[1fr_1fr_130px_36px]">
                              <input
                                value={field.label}
                                onChange={(event) =>
                                  updateFormField(
                                    index,
                                    "label",
                                    event.target.value,
                                  )
                                }
                                className="h-10 rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-blue-600"
                                placeholder="Field label"
                              />
                              <input
                                value={field.placeholder ?? ""}
                                onChange={(event) =>
                                  updateFormField(
                                    index,
                                    "placeholder",
                                    event.target.value,
                                  )
                                }
                                className="h-10 rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-blue-600"
                                placeholder="Placeholder"
                              />
                              <select
                                value={field.type ?? "text"}
                                onChange={(event) =>
                                  updateFormField(
                                    index,
                                    "type",
                                    event.target.value,
                                  )
                                }
                                className="h-10 rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-blue-600"
                              >
                                <option value="text">Text</option>
                                <option value="email">Email</option>
                                <option value="tel">Phone</option>
                                <option value="textarea">Textarea</option>
                              </select>
                              <button
                                type="button"
                                onClick={() => deleteFormField(index)}
                                className="flex h-10 w-10 items-center justify-center rounded-lg border border-red-500 text-red-600"
                                aria-label="Delete form field"
                              >
                                <Trash size={16} />
                              </button>
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  </section>
                </div>
              )}

            {showBoxLayoutTab && activeTab === "Box Layout" && (
              <div className="space-y-5">
               

                <div className="grid gap-3 sm:grid-cols-2">
                  {[2, 3, 4, 5, 6]
                    .filter(
                      (count) =>
                        activeSectionType !== "Features" ||
                        count <= MAX_FEATURE_CARDS,
                    )
                    .map((count) => {
                      const isSelected =
                        configuredBoxLayout === count ||
                        (activeSectionType === "Features" &&
                          count === MAX_FEATURE_CARDS &&
                          typeof configuredBoxLayout === "number" &&
                          configuredBoxLayout > MAX_FEATURE_CARDS);

                      return (
                        <button
                          key={count}
                          type="button"
                          onClick={() => {
                            setBoxLayoutMessage("");
                            if (subsectionScope && boxLayoutCollectionField) {
                              updateActiveGenericData({
                                boxLayoutByField: {
                                  ...boxLayoutByField,
                                  [boxLayoutCollectionField]: count,
                                },
                              });
                              return;
                            }

                            updateActiveGenericData({ boxesPerRow: count });
                          }}
                          className={`rounded-xl border p-4 text-left transition ${isSelected
                            ? "border-blue-600 bg-blue-50 ring-2 ring-blue-600/15"
                            : "border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50"
                            }`}
                        >
                          <span className="text-sm font-semibold text-slate-900">
                            {count} boxes
                          </span>
                          <span
                            className="mt-3 grid gap-1.5"
                            style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}
                            aria-hidden
                          >
                            {Array.from({ length: count }, (_, index) => (
                              <span
                                key={index}
                                className={`h-9 rounded-md ${isSelected ? "bg-blue-600" : "bg-slate-200"
                                  }`}
                              />
                            ))}
                          </span>
                        </button>
                      );
                    })}
                </div>

                {!configuredBoxLayout && (
                  <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                    The component&apos;s original card layout is currently active.
                  </p>
                )}
                {boxLayoutMessage && (
                  <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                    {boxLayoutMessage}
                  </p>
                )}
              </div>
            )}

            {![
              "Topbar",
              "Header",
              "Banner",
              "FormDetail",
              "Footer",
            ].includes(activeSectionType) &&
              (activeTab.endsWith("Content") ||
                activeTab === "Tabs" ||
                (hasScopedContentAndFormTabs && activeTab === "Form") ||
                (isEventsHomeContact && activeTab === "Form") ||
                (activeSectionType === "CareerPage" &&
                  activeTab === "CareerPage Form") ||
                (showEventsCareersFormTab &&
                  activeTab === EVENTS_CAREERS_FORM_TAB)) && (
                <div className="space-y-5">
                  {isBreadcrumbEditor && (
                    <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4">
                      <label className="block">
                        <span className="mb-1 block text-xs font-semibold text-slate-600">
                          Background Type
                        </span>
                        <select
                          value={breadcrumbBackgroundType}
                          onChange={(event) => {
                            const nextType =
                              event.target.value === "color" ? "color" : "image";

                            if (nextType === "color") {
                              updateActiveGenericData({
                                breadcrumbBackgroundType: "color",
                                backgroundImage: "",
                                breadcrumbColorBackgroundType:
                                  activeGenericEditorData?.breadcrumbColorBackgroundType ===
                                  "gradient"
                                    ? "gradient"
                                    : "solid",
                                backgroundColor:
                                  activeGenericEditorData?.backgroundColor ||
                                  breadcrumbDefaultSolid,
                                breadcrumbGradientColor:
                                  activeGenericEditorData?.breadcrumbGradientColor ||
                                  breadcrumbDefaultGradient,
                              });
                              return;
                            }

                            updateGenericField(
                              ["breadcrumbBackgroundType"],
                              "image",
                            );
                          }}
                          className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-blue-600"
                        >
                          <option value="image">Background image</option>
                          <option value="color">Background color</option>
                        </select>
                      </label>

                      {breadcrumbBackgroundType === "image" && (
                        <div>
                          <span className="mb-1 block text-xs font-semibold text-slate-600">
                            Background Image
                          </span>
                          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem] sm:items-start">
                            <button
                              type="button"
                              onClick={() =>
                                breadcrumbImageInputRef.current?.click()
                              }
                              className="flex h-10 w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 transition hover:border-blue-500 focus:border-blue-600 focus:outline-none"
                            >
                              <span className="font-medium">
                                {activeGenericEditorData?.backgroundImage
                                  ? "Change image"
                                  : "Upload image"}
                              </span>
                              <span className="max-w-[55%] truncate text-xs text-slate-500">
                                {getMediaUploadLabel(
                                  activeGenericEditorData?.backgroundImage ?? "",
                                  "image",
                                )}
                              </span>
                            </button>
                            <MediaUploadPreview
                              src={activeGenericEditorData?.backgroundImage ?? ""}
                              type="image"
                            />
                          </div>
                          <input
                            ref={breadcrumbImageInputRef}
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              if (file) {
                                updateGenericMedia(
                                  ["backgroundImage"],
                                  "backgroundImage",
                                  file,
                                );
                              }
                              event.target.value = "";
                            }}
                          />
                        </div>
                      )}

                      {breadcrumbBackgroundType === "image" && (
                        <div className="border-t border-gray-200 pt-4">
                          <ColorInput
                            label="Text color"
                            value={breadcrumbTextColor}
                            onChange={(color) =>
                              updateGenericField(["textColor"], color)
                            }
                          />
                        </div>
                      )}

                      {breadcrumbBackgroundType === "color" && (
                        <div className="space-y-4 border-t border-gray-200 pt-4">
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="text-sm font-semibold text-gray-950">
                              Background Type :
                            </span>
                            {(["solid", "gradient"] as const).map((type) => {
                              const isActive =
                                breadcrumbColorBackgroundType === type;

                              return (
                                <button
                                  key={type}
                                  type="button"
                                  onClick={() =>
                                    updateActiveGenericData({
                                      breadcrumbBackgroundType: "color",
                                      backgroundImage: "",
                                      breadcrumbColorBackgroundType: type,
                                      backgroundColor:
                                        activeGenericEditorData?.backgroundColor ||
                                        breadcrumbDefaultSolid,
                                      breadcrumbGradientColor:
                                        activeGenericEditorData?.breadcrumbGradientColor ||
                                        breadcrumbDefaultGradient,
                                    })
                                  }
                                  className={`h-10 min-w-28 rounded-xl border px-5 text-sm font-semibold capitalize text-gray-950 shadow-sm transition ${
                                    isActive
                                      ? "border-gray-300 bg-white"
                                      : "border-transparent bg-slate-200 hover:bg-white"
                                  }`}
                                >
                                  {type}
                                </button>
                              );
                            })}
                          </div>

                          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                            <ColorInput
                              label="Text color"
                              value={breadcrumbTextColor}
                              onChange={(color) =>
                                updateGenericField(["textColor"], color)
                              }
                            />
                            <ColorInput
                              label={
                                breadcrumbColorBackgroundType === "gradient"
                                  ? "Background left"
                                  : "Background color"
                              }
                              value={breadcrumbSolidColor}
                              onChange={(color) =>
                                updateGenericField(["backgroundColor"], color)
                              }
                            />
                            {breadcrumbColorBackgroundType === "gradient" && (
                              <ColorInput
                                label="Background right"
                                value={breadcrumbGradientColor}
                                onChange={(color) =>
                                  updateGenericField(
                                    ["breadcrumbGradientColor"],
                                    color,
                                  )
                                }
                              />
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {isNGOBreadcrumbEditor && (
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold text-slate-600">
                        Title
                      </span>
                      <input
                        value={ngoBreadcrumbTitle}
                        onChange={(event) =>
                          updateActiveGenericData({
                            banner: {
                              ...ngoBreadcrumbBanner,
                              breadcrumbCurrent: event.target.value,
                            },
                          })
                        }
                        className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-blue-600"
                      />
                    </label>
                  )}
                  {activeSectionType === "PopularEvents" &&
                    activeTab === "Tabs" && (
                      <GenericFieldEditor
                        fieldName="tabs"
                        value={popularEventTabItems}
                        path={["tabs"]}
                        sectionType={activeSectionType}
                        onChange={updateGenericField}
                        onMediaChange={updateGenericMedia}
                        onAddArrayItem={addGenericCollectionItem}
                        onDeleteArrayItem={deleteGenericCollectionItem}
                        availablePageNames={availablePageNames}
                      />
                    )}
                  {showEventsTeamTabsTab && activeTab === "Tabs" && (
                    <GenericFieldEditor
                      fieldName="departments"
                      value={
                        (activeGenericEditorData?.departments ??
                          activeGenericData?.departments ??
                          []) as unknown[]
                      }
                      path={["departments"]}
                      sectionType={activeSectionType}
                      category={category}
                      onChange={updateGenericField}
                      onMediaChange={updateGenericMedia}
                      onAddArrayItem={addGenericCollectionItem}
                      onDeleteArrayItem={deleteGenericCollectionItem}
                      availablePageNames={availablePageNames}
                      cardFields={eventsTeamsDepartmentCardFields}
                    />
                  )}
                  {showEventsCareersFormTab &&
                    activeTab === EVENTS_CAREERS_FORM_TAB && (
                      <div className="space-y-5">
                        <section className="rounded-xl border border-gray-200 bg-white p-4">
                          <h4 className="text-sm font-bold text-slate-900">
                            Form Settings
                          </h4>
                          <div className="mt-4 grid gap-4 md:grid-cols-2">
                            <label className="block">
                              <span className="mb-1 block text-xs font-semibold text-slate-600">
                                Form Title
                              </span>
                              <input
                                value={activeCareersApplyForm.title}
                                onChange={(event) =>
                                  updateCareersApplyForm({
                                    title: event.target.value,
                                  })
                                }
                                className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-blue-600"
                              />
                            </label>
                            <label className="block">
                              <span className="mb-1 block text-xs font-semibold text-slate-600">
                                Submit Label
                              </span>
                              <input
                                value={activeCareersApplyForm.submitLabel}
                                onChange={(event) =>
                                  updateCareersApplyForm({
                                    submitLabel: event.target.value,
                                  })
                                }
                                className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-blue-600"
                              />
                            </label>
                            <label className="block md:col-span-2">
                              <span className="mb-1 block text-xs font-semibold text-slate-600">
                                Form Subtitle
                              </span>
                              <input
                                value={activeCareersApplyForm.subtitle}
                                onChange={(event) =>
                                  updateCareersApplyForm({
                                    subtitle: event.target.value,
                                  })
                                }
                                className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-blue-600"
                              />
                            </label>
                            <label className="block md:col-span-2">
                              <span className="mb-1 block text-xs font-semibold text-slate-600">
                                Success Message
                              </span>
                              <textarea
                                value={activeCareersApplyForm.successDescription}
                                onChange={(event) =>
                                  updateCareersApplyForm({
                                    successDescription: event.target.value,
                                  })
                                }
                                className="min-h-24 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
                              />
                            </label>
                          </div>
                        </section>

                        <GenericFieldEditor
                          fieldName="locations"
                          value={activeCareersApplyForm.locations}
                          path={["applyForm", "locations"]}
                          sectionType={activeSectionType}
                          category={category}
                          onChange={updateGenericField}
                          onMediaChange={updateGenericMedia}
                          onAddArrayItem={addGenericCollectionItem}
                          onDeleteArrayItem={deleteGenericCollectionItem}
                          availablePageNames={availablePageNames}
                        />
                        <GenericFieldEditor
                          fieldName="noticePeriods"
                          value={activeCareersApplyForm.noticePeriods}
                          path={["applyForm", "noticePeriods"]}
                          sectionType={activeSectionType}
                          category={category}
                          onChange={updateGenericField}
                          onMediaChange={updateGenericMedia}
                          onAddArrayItem={addGenericCollectionItem}
                          onDeleteArrayItem={deleteGenericCollectionItem}
                          availablePageNames={availablePageNames}
                        />

                        <section className="rounded-xl bg-[#f4f4f5] p-4">
                          <div className="mb-4 flex items-center justify-between gap-3">
                            <h4 className="text-sm font-bold text-slate-900">
                              Form Fields
                            </h4>
                            <button
                              type="button"
                              onClick={addCareersApplyFormField}
                              disabled={
                                activeCareersApplyForm.fields.length >=
                                MAX_EVENTS_CAREERS_FORM_FIELDS
                              }
                              className="rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
                            >
                              Add Field
                            </button>
                          </div>
                          <p className="-mt-2 mb-4 text-xs font-medium text-slate-500">
                            {activeCareersApplyForm.fields.length}/
                            {MAX_EVENTS_CAREERS_FORM_FIELDS} fields added
                          </p>

                          <div className="space-y-3">
                            {activeCareersApplyForm.fields.map(
                              (field, index) => (
                                <div
                                  key={`${field.name ?? "field"}-${index}`}
                                  className="rounded-xl border border-slate-200 bg-white p-3"
                                >
                                  <div className="mb-3 flex items-center justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        moveCareersApplyFormField(
                                          index,
                                          index - 1,
                                        )
                                      }
                                      disabled={index === 0}
                                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                                      aria-label={`Move field ${index + 1} up`}
                                    >
                                      <ChevronUp size={16} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        moveCareersApplyFormField(
                                          index,
                                          index + 1,
                                        )
                                      }
                                      disabled={
                                        index ===
                                        activeCareersApplyForm.fields.length - 1
                                      }
                                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                                      aria-label={`Move field ${index + 1} down`}
                                    >
                                      <ChevronDown size={16} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setPendingCareersFormFieldDeleteIndex(
                                          index,
                                        )
                                      }
                                      disabled={
                                        activeCareersApplyForm.fields.length <=
                                        1
                                      }
                                      className="flex h-8 items-center gap-1 rounded-lg border border-red-200 bg-white px-3 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 disabled:hover:bg-white"
                                    >
                                      <Trash size={15} />
                                      Delete
                                    </button>
                                  </div>

                                  <div className="grid gap-3 md:grid-cols-2">
                                    <label className="block">
                                      <span className="mb-1 block text-xs font-semibold text-slate-600">
                                        Label
                                      </span>
                                      <input
                                        value={field.label ?? ""}
                                        onChange={(event) =>
                                          updateCareersApplyFormItemField(
                                            index,
                                            "label",
                                            event.target.value,
                                          )
                                        }
                                        className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-blue-600"
                                      />
                                    </label>
                                    <label className="block md:col-span-1">
                                      <span className="mb-1 block text-xs font-semibold text-slate-600">
                                        Placeholder
                                      </span>
                                      <input
                                        value={field.placeholder ?? ""}
                                        onChange={(event) =>
                                          updateCareersApplyFormItemField(
                                            index,
                                            "placeholder",
                                            event.target.value,
                                          )
                                        }
                                        className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-blue-600"
                                      />
                                    </label>
                                    <label className="block">
                                      <span className="mb-1 block text-xs font-semibold text-slate-600">
                                        Field Type
                                      </span>
                                      <select
                                        value={field.type ?? "text"}
                                        onChange={(event) =>
                                          updateCareersApplyFormItemField(
                                            index,
                                            "type",
                                            event.target.value,
                                          )
                                        }
                                        className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-blue-600"
                                      >
                                        <option value="text">Text</option>
                                        <option value="email">Email</option>
                                        <option value="tel">Phone</option>
                                        <option value="url">URL</option>
                                        <option value="textarea">
                                          Textarea
                                        </option>
                                        <option value="select">Select</option>
                                        <option value="file">File Upload</option>
                                      </select>
                                    </label>
                                    <label className="block">
                                      <span className="mb-1 block text-xs font-semibold text-slate-600">
                                        Width
                                      </span>
                                      <select
                                        value={field.width ?? "half"}
                                        onChange={(event) =>
                                          updateCareersApplyFormItemField(
                                            index,
                                            "width",
                                            event.target.value,
                                          )
                                        }
                                        className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-blue-600"
                                      >
                                        <option value="half">Half</option>
                                        <option value="full">Full</option>
                                      </select>
                                    </label>
                                    {field.type === "select" && (
                                      <label className="block md:col-span-2">
                                        <span className="mb-1 block text-xs font-semibold text-slate-600">
                                          Options Source
                                        </span>
                                        <select
                                          value={field.optionsSource ?? ""}
                                          onChange={(event) =>
                                            updateCareersApplyFormItemField(
                                              index,
                                              "optionsSource",
                                              event.target.value || undefined,
                                            )
                                          }
                                          className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-blue-600"
                                        >
                                          <option value="">
                                            Custom options
                                          </option>
                                          <option value="locations">
                                            Locations list
                                          </option>
                                          <option value="noticePeriods">
                                            Notice periods list
                                          </option>
                                        </select>
                                      </label>
                                    )}
                                    <label className="flex items-center gap-2 md:col-span-2">
                                      <input
                                        type="checkbox"
                                        checked={Boolean(field.required)}
                                        onChange={(event) =>
                                          updateCareersApplyFormItemField(
                                            index,
                                            "required",
                                            event.target.checked,
                                          )
                                        }
                                      />
                                      <span className="text-sm font-semibold text-slate-700">
                                        Required field
                                      </span>
                                    </label>
                                  </div>
                                </div>
                              ),
                            )}
                          </div>
                        </section>

                        {pendingCareersFormFieldDeleteIndex !== null &&
                          createPortal(
                            <div className="fixed inset-0 z-[10020] flex items-center justify-center bg-slate-950/45 px-4">
                              <div
                                role="alertdialog"
                                aria-modal="true"
                                aria-labelledby="delete-careers-form-field-title"
                                className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-2xl"
                              >
                                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-600">
                                  <Trash size={20} />
                                </div>
                                <h3
                                  id="delete-careers-form-field-title"
                                  className="mt-4 text-xl font-semibold text-slate-950"
                                >
                                  Delete this field?
                                </h3>
                                <p className="mt-2 text-sm leading-6 text-slate-600">
                                  “
                                  {activeCareersApplyForm.fields[
                                    pendingCareersFormFieldDeleteIndex
                                  ]?.label?.trim() ||
                                    `Field ${pendingCareersFormFieldDeleteIndex + 1}`}
                                  ” will be removed from the apply form.
                                </p>
                                <div className="mt-6 flex justify-center gap-3">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setPendingCareersFormFieldDeleteIndex(
                                        null,
                                      )
                                    }
                                    className="rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      deleteCareersApplyFormField(
                                        pendingCareersFormFieldDeleteIndex,
                                      )
                                    }
                                    className="rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            </div>,
                            document.body,
                          )}
                      </div>
                    )}
                  {!(
                    showEventsCareersFormTab &&
                    activeTab === EVENTS_CAREERS_FORM_TAB
                  ) &&
                    visibleGenericContentEntries.map(([key, value]) => (
                    <GenericFieldEditor
                      key={key}
                      fieldName={key}
                      value={value}
                      path={[key]}
                      sectionType={activeSectionType}
                      category={category}
                      onChange={updateGenericField}
                      onMediaChange={updateGenericMedia}
                      onAddArrayItem={addGenericCollectionItem}
                      onDeleteArrayItem={deleteGenericCollectionItem}
                      availablePageNames={availablePageNames}
                      cardFields={activeCardFields}
                      categorySelectOptions={activeCategorySelectOptions}
                    />
                  ))}
                </div>
              )}

            {["WhyChooseUs", "Service", "Gallery", "Contact", "FAQ", "Testimonial", "Awards", "Blog", "CompanyStatistics", "Causes", "Projects", "Events", "Cta"].includes(activeSectionType) &&
              !(category === "Events" && isPageSection) &&
              !isEventsInnerSubsectionLayout &&
              !isNGOAboutPageLayout &&
              activeTab.endsWith("Layout") &&
              activeTab !== "Box Layout" && (
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
                      currentSection?.variant === layout.id ||
                      currentSection?.variant === layout.componentVariant;
                    const Component = getSectionComponent(
                      category,
                      activeSectionType,
                      layout.componentVariant ?? layout.id,
                    );
                    const layoutData =
                      currentSection?.data?.[layout.id] ??
                      currentSection?.data?.[layout.componentVariant ?? ""] ??
                      getCategoryVariantData(
                        category,
                        activeSectionType,
                        layout.componentVariant ?? layout.id,
                      ) ??
                      activeGenericData;

                    return (
                      <button
                        key={layout.id}
                        type="button"
                        onClick={() =>
                          selectSectionVariant(
                            layout.componentVariant ?? layout.id,
                          )
                        }
                        className={`relative w-full overflow-hidden rounded-2xl border bg-white text-left ${isActive ? "border-gray-400" : "border-gray-200"
                          }`}
                      >
                        <SelectedLayoutBadge active={isActive} title={layout.name} />
                        <div className="h-36 overflow-hidden bg-white">
                          {Component ? (
                            <div className="h-[520px] w-[1200px] origin-top-left scale-[0.32]">
                              <Component data={layoutData} />
                            </div>
                          ) : (
                            <div className="flex h-full items-center justify-center text-sm font-semibold">
                              {layout.name}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

            {activeSectionType === "Footer" &&
              activeTab === "Footer Layout" && (
                <div className="space-y-4">
                  <SectionColorPanel
                    title="Footer Layout"
                    backgroundType={footerBackgroundType}
                    backgroundColor={footerSolidColor}
                    gradientColor={footerGradientColor}
                    textColor={footerTextColor}
                    onBackgroundTypeChange={updateFooterBackgroundType}
                    onBackgroundColorChange={updateFooterSolidColor}
                    onGradientColorChange={updateFooterGradientColor}
                    onTextColorChange={updateFooterTextColor}
                  />

                  {sectionLayoutOptions.map((layout) => {
                    const isActive = currentSection?.variant === layout.id;

                    return (
                      <button
                        key={layout.id}
                        type="button"
                        onClick={() => selectSectionVariant(layout.id)}
                        className={`relative w-full overflow-hidden rounded-2xl border bg-white text-left ${isActive ? "border-gray-400" : "border-gray-200"
                          }`}
                      >
                        <SelectedLayoutBadge active={isActive} title={layout.name} />
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
              activeTab === "Footer Content" && (
                <div className="space-y-5">
                  {isNGOFooter && (
                    <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                      <h3 className="text-sm font-semibold text-gray-900">
                        Newsletter
                      </h3>
                      {renderFooterContentField("newsletterTitle")}
                      {renderFooterContentField("newsletterDesc")}
                      {renderFooterContentField("newsletterPlaceholder")}
                      {renderFooterContentField("newsletterButtonLabel")}
                    </section>
                  )}

                  {activeGenericData?.logo ||
                    activeGenericData?.logoImage ||
                    activeGenericData?.desc ? (
                    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold text-gray-900">
                          Footer logo
                        </h3>

                        <button
                          type="button"
                          aria-label="Delete footer logo section"
                          onClick={() =>
                            setPendingFooterSectionDelete({
                              kind: "logo",
                              label: "Footer logo",
                            })
                          }
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                        >
                          <Trash size={14} />
                        </button>
                      </div>

                      <p className="mt-1 text-xs text-gray-500">
                        Use a text logo or upload an image.
                      </p>

                      {usesTypedFooterLogo ? (
                        <label className="mt-4 block text-xs font-medium text-gray-700">
                          Logo Type
                          <select
                            value={resolvedFooterLogoType}
                            onChange={(event) =>
                              updateFooterLogoType(
                                event.target.value as
                                  | "image"
                                  | "text"
                                  | "image-text",
                              )
                            }
                            className="mt-1 h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-blue-600"
                          >
                            <option value="image">Image logo</option>
                            <option value="text">Text Logo</option>
                            <option value="image-text">Image + Text logo</option>
                          </select>
                        </label>
                      ) : null}

                      {(!usesTypedFooterLogo || showFooterLogoText) && (
                        <>
                          <label className="mt-4 block text-xs font-medium text-gray-700">
                            Logo text
                          </label>

                          <input
                            value={activeFooterData?.logo ?? ""}
                            onChange={(event) =>
                              updateActiveFooterData({
                                logo: event.target.value,
                              })
                            }
                            className="mt-1 h-11 w-full rounded-lg border border-gray-300 px-4 text-sm text-gray-900 outline-none focus:border-blue-600"
                            placeholder="Your site name"
                          />
                        </>
                      )}

                      {(!usesTypedFooterLogo
                        ? "logoImage" in (activeFooterData ?? {})
                        : showFooterLogoImage) && (
                        <>
                          <div className="mt-4 flex flex-wrap items-center gap-3">
                            <label className="cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700">
                              Upload logo
                              <input
                                type="file"
                                accept="image/*"
                                className="sr-only"
                                onChange={updateFooterLogoImage}
                              />
                            </label>

                            {activeFooterData?.logoImage && !isEventsFooter && (
                              <button
                                type="button"
                                onClick={() =>
                                  updateActiveFooterData({
                                    logoImage: "",
                                    logoImageTitle: "",
                                  })
                                }
                                className="rounded-lg border border-red-200 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                              >
                                Remove image
                              </button>
                            )}
                          </div>

                          {activeFooterData?.logoImage ? (
                            <div className="mt-3 flex h-20 w-32 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-2">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={activeFooterData.logoImage}
                                alt={
                                  activeFooterData.logoImageTitle ||
                                  "Logo preview"
                                }
                                className="max-h-full max-w-full object-contain"
                              />
                            </div>
                          ) : null}

                          <input
                            value={activeFooterData?.logoImageTitle ?? ""}
                            onChange={(event) =>
                              updateActiveFooterData({
                                logoImageTitle: event.target.value,
                              })
                            }
                            className="mt-3 h-11 w-full rounded-lg border border-gray-300 px-4 text-sm text-gray-900 outline-none focus:border-blue-600"
                            placeholder="Logo image alt text"
                          />
                        </>
                      )}

                      <div className="mt-4">
                        {renderFooterContentField("desc")}
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        updateActiveFooterData(
                          isNGOFooter
                            ? {
                                logo: "NGO",
                                logoImage: "/logo.png",
                                logoImageTitle: "NGO Logo",
                                logoType: "image",
                                desc: "We are a non-profit organization working for children and communities in need.",
                              }
                            : isEventsFooter
                              ? {
                                  logo: "Events",
                                  logoImage:
                                    "/categories/events/template1/logo/logoo.png",
                                  logoImageTitle: "Events Logo",
                                  logoType: "image",
                                  desc: "Creating Memorable Events With Seamless Planning.",
                                }
                            : {
                                logo: "HAUS Group",
                                logoImage: "",
                                logoImageTitle: "",
                                desc: "Add your footer description here.",
                              },
                        )
                      }
                      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-emerald-300 bg-emerald-50 px-4 py-4 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
                    >
                      <Plus size={16} />
                      Add Footer Logo
                    </button>
                  )}

                  {(isNGOFooter
                    ? visibleFooterColumns.slice(0, 2)
                    : visibleFooterColumns
                  ).map((column, columnIndex) =>
                    renderFooterLinkColumnEditor(column, columnIndex),
                  )}

                  {!isNGOFooter && (
                    <button
                      type="button"
                      onClick={addFooterColumn}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-emerald-300 bg-emerald-50 px-4 py-4 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
                    >
                      <Plus size={16} />
                      Add Footer Link Column
                    </button>
                  )}

                  {activeGenericData?.footerContact ? (
                    <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold text-gray-900">
                          Contact details
                        </h3>

                        <button
                          type="button"
                          aria-label="Delete contact details section"
                          onClick={() =>
                            setPendingFooterSectionDelete({
                              kind: "contact",
                              label: "Contact details",
                            })
                          }
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                        >
                          <Trash size={14} />
                        </button>
                      </div>

                      {renderFooterContentField("contactLabel")}
                      {!isNGOFooter &&
                        !isEventsFooter &&
                        renderFooterContentField("officeLabel")}
                      {renderFooterContentField("footerContact")}
                    </section>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        updateActiveFooterData(
                          isNGOFooter
                            ? {
                                contactLabel: "Contact Info",
                                footerContact: {
                                  phone: "987-0986-0987",
                                  email: "support@huruma.com",
                                  location:
                                    "205 Fida Walinton, Tongo New York, Canada",
                                },
                              }
                            : {
                                contactLabel: "Call an advisor",
                                footerContact: {
                                  phone: "+91 98765 43210",
                                  email: "hello@example.com",
                                  location: "Your office address",
                                },
                                officeLabel: "Visit us",
                              },
                        )
                      }
                      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-emerald-300 bg-emerald-50 px-4 py-4 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
                    >
                      <Plus size={16} />
                      Add Contact Details
                    </button>
                  )}

                  {isNGOFooter &&
                    visibleFooterColumns
                      .slice(2)
                      .map((column, offset) =>
                        renderFooterLinkColumnEditor(column, offset + 2),
                      )}

                  {isNGOFooter && (
                    <button
                      type="button"
                      onClick={addFooterColumn}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-emerald-300 bg-emerald-50 px-4 py-4 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
                    >
                      <Plus size={16} />
                      Add Footer Link Column
                    </button>
                  )}

                  {showFooterLegalExtras &&
                    (activeGenericData?.disclaimerText ? (
                      <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="text-sm font-semibold text-gray-900">Disclaimer</h3>
                          <button type="button" aria-label="Delete disclaimer section" onClick={() => setPendingFooterSectionDelete({ kind: "disclaimer", label: "Disclaimer" })} className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50"><Trash size={14} /></button>
                        </div>
                        {renderFooterContentField("disclaimerTitle")}
                        {renderFooterContentField("disclaimerText")}
                      </section>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          updateActiveFooterData({
                            disclaimerTitle: "Disclaimer",
                            disclaimerText: "Add your disclaimer text here.",
                          })
                        }
                        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-emerald-300 bg-emerald-50 px-4 py-4 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
                      >
                        <Plus size={16} />
                        Add Disclaimer
                      </button>
                    ))}

                  {activeGenericData?.copyrightText ||
                    activeGenericData?.footerLegalLinks ||
                    activeGenericData?.socialLinks ||
                    activeGenericData?.footerSocialLinks ? (
                    <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold text-gray-900">
                          Bottom bar
                        </h3>

                        <button
                          type="button"
                          aria-label="Delete bottom bar section"
                          onClick={() =>
                            setPendingFooterSectionDelete({
                              kind: "bottom",
                              label: "Bottom bar",
                            })
                          }
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                        >
                          <Trash size={14} />
                        </button>
                      </div>

                      {!isNGOFooter && (
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-600">
                          Copyright text
                        </label>

                        <input
                          type="text"
                          value={activeFooterData?.copyrightText ?? ""}
                          onChange={(event) =>
                            updateActiveFooterData({
                              copyrightText: event.target.value,
                            })
                          }
                          className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-blue-600"
                          placeholder="© 2026 HAUS Group. All rights reserved."
                        />
                      </div>
                      )}

                      {/* Legal Links */}
                      <div className="rounded-xl border border-gray-200 bg-[#f8f8f8] p-4">
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <div>
                            <h4 className="text-sm font-semibold text-gray-900">
                              Legal Links
                            </h4>

                            <p className="mt-1 text-xs text-gray-500">
                              Manage privacy, terms and other legal links.
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={addFooterLegalLink}
                            className="flex items-center gap-1 rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                          >
                            <Plus size={14} />
                            Add Link
                          </button>
                        </div>

                        {showFooterLegalExtras && (
                          <div className="mb-3">
                            <label className="mb-1 block text-xs font-semibold text-slate-600">
                              Legal title
                            </label>

                            <input
                              value={activeFooterData?.legalTitle ?? ""}
                              onChange={(event) =>
                                updateActiveFooterData({
                                  legalTitle: event.target.value,
                                })
                              }
                              className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-blue-600"
                              placeholder="Legal"
                            />
                          </div>
                        )}

                        <div className="space-y-3">
                          {(activeFooterData?.footerLegalLinks ?? []).map(
                            (link, index) => (
                              <div
                                key={index}
                                className="grid gap-3 rounded-lg border border-gray-200 bg-white p-3 sm:grid-cols-[1fr_1fr_auto]"
                              >
                                <div>
                                  <label className="mb-1 block text-xs font-medium text-gray-600">
                                    Label
                                  </label>

                                  <input
                                    value={link.label}
                                    onChange={(event) =>
                                      updateFooterLegalLink(
                                        index,
                                        "label",
                                        event.target.value,
                                      )
                                    }
                                    className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-blue-600"
                                    placeholder="Privacy Policy"
                                  />
                                </div>

                                <div>
                                  <label className="mb-1 block text-xs font-medium text-gray-600">
                                    Link
                                  </label>

                                  <input
                                    value={link.href}
                                    onChange={(event) =>
                                      updateFooterLegalLink(
                                        index,
                                        "href",
                                        event.target.value,
                                      )
                                    }
                                    className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-blue-600"
                                    placeholder="/privacy-policy"
                                  />
                                </div>

                                <div className="flex items-end">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      removeFooterLegalLink(index)
                                    }
                                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                                    aria-label="Delete legal link"
                                  >
                                    <Trash size={14} />
                                  </button>
                                </div>
                              </div>
                            ),
                          )}

                          {(activeFooterData?.footerLegalLinks ?? []).length === 0 && (
                            <p className="text-xs text-gray-500">
                              No legal links added.
                            </p>
                          )}
                        </div>
                      </div>

                      {!isNGOFooter && (
                      <div className="rounded-xl border border-gray-200 bg-[#f8f8f8] p-4">
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <div>
                            <h4 className="text-sm font-semibold text-gray-900">
                              Social Links
                            </h4>

                            <p className="mt-1 text-xs text-gray-500">
                              Add your social media links.
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={addFooterSocialLink}
                            disabled={
                              (
                                activeFooterData?.socialLinks ??
                                activeFooterData?.footerSocialLinks ??
                                []
                              ).length >= MAX_FOOTER_SOCIAL_LINKS
                            }
                            className="
    flex items-center gap-1 rounded-md
    bg-blue-600 px-3 py-2
    text-xs font-semibold text-white
    transition-colors
    hover:bg-blue-700
    disabled:cursor-not-allowed
    disabled:bg-gray-200
    disabled:text-gray-400
    disabled:hover:bg-gray-200
  "
                          >
                            <Plus size={14} />

                            {(
                              activeFooterData?.socialLinks ??
                              activeFooterData?.footerSocialLinks ??
                              []
                            ).length >= MAX_FOOTER_SOCIAL_LINKS
                              ? `Maximum ${MAX_FOOTER_SOCIAL_LINKS} Added`
                              : "Add Social"}
                          </button>
                        </div>

                        <div className="space-y-3">
                          {(
                            activeFooterData?.socialLinks ??
                            activeFooterData?.footerSocialLinks ??
                            []
                          ).map((social, index) => (
                            <div
                              key={index}
                              className="grid gap-3 rounded-lg border border-gray-200 bg-white p-3 sm:grid-cols-[1fr_1fr_auto]"
                            >
                              <div>
                                <label className="mb-1 block text-xs font-medium text-gray-600">
                                  Platform
                                </label>

                                <select
                                  value={social.label}
                                  onChange={(event) =>
                                    updateFooterSocialLink(
                                      index,
                                      "label",
                                      event.target.value,
                                    )
                                  }
                                  className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm capitalize outline-none focus:border-blue-600"
                                >
                                  {socialLinkLabels.map((socialName) => (
                                    <option
                                      key={socialName}
                                      value={socialName}
                                    >
                                      {socialName}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="mb-1 block text-xs font-medium text-gray-600">
                                  Link
                                </label>

                                <input
                                  value={social.href}
                                  onChange={(event) =>
                                    updateFooterSocialLink(
                                      index,
                                      "href",
                                      event.target.value,
                                    )
                                  }
                                  className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-blue-600"
                                  placeholder="https://..."
                                />
                              </div>

                              <div className="flex items-end">
                                <button
                                  type="button"
                                  onClick={() =>
                                    removeFooterSocialLink(index)
                                  }
                                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                                  aria-label="Delete social link"
                                >
                                  <Trash size={14} />
                                </button>
                              </div>
                            </div>
                          ))}

                          {(
                            activeFooterData?.socialLinks ??
                            activeFooterData?.footerSocialLinks ??
                            []
                          ).length === 0 && (
                              <p className="text-xs text-gray-500">
                                No social links added.
                              </p>
                            )}
                        </div>
                      </div>
                      )}
                    </section>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        updateActiveFooterData(
                          isNGOFooter
                            ? {
                                footerLegalLinks: [
                                  {
                                    label: "Privacy Policy",
                                    href: "/privacy-policy",
                                  },
                                  {
                                    label: "Terms & Conditions",
                                    href: "/terms-conditions",
                                  },
                                ],
                              }
                            : {
                          copyrightText: `© ${new Date().getFullYear()} HAUS Group. All rights reserved.`,

                          ...(showFooterLegalExtras ? { legalTitle: "Legal" } : {}),

                          footerLegalLinks: [
                            {
                              label: "Privacy Policy",
                              href: "/privacy-policy",
                            },
                            {
                              label: "Terms & Conditions",
                              href: "/terms-and-conditions",
                            },
                          ],

                          socialLinks: [
                            {
                              label: "facebook",
                              href: "#",
                            },
                            {
                              label: "instagram",
                              href: "#",
                            },
                          ],
                        },
                        )
                      }
                      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-emerald-300 bg-emerald-50 px-4 py-4 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
                    >
                      <Plus size={16} />
                      Add Bottom Bar
                    </button>
                  )}

                </div>
              )}

            {activeTab.endsWith("Content") &&
              automaticContentFields.length > 0 &&
              !(category === "NGO" && activeSectionType === "Footer") &&
              !(category === "Events" && activeSectionType === "Footer") && (
                <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-4">
                  <h4 className="text-sm font-bold text-slate-900">
                    Additional Content
                  </h4>
                  {automaticContentFields.map((field) => (
                    <GenericFieldEditor
                      key={field.path.join(".")}
                      fieldName={field.fieldName}
                      value={field.value}
                      path={field.path}
                      sectionType={activeSectionType}
                      category={category}
                      onChange={updateGenericField}
                      onMediaChange={updateGenericMedia}
                      availablePageNames={availablePageNames}
                      cardFields={activeCardFields}
                      categorySelectOptions={activeCategorySelectOptions}
                    />
                  ))}
                </section>
              )}

            {pendingFooterSectionDelete &&
              createPortal(
                <div className="fixed inset-0 z-[10030] flex items-center justify-center bg-slate-950/45 px-4">
                  <div role="alertdialog" aria-modal="true" aria-labelledby="delete-footer-section-title" className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-2xl">
                    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-600"><Trash size={20} /></div>
                    <h3 id="delete-footer-section-title" className="mt-4 text-xl font-semibold text-slate-950">Delete this footer section?</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">“{pendingFooterSectionDelete.label}” will be removed from the footer.</p>
                    <div className="mt-6 flex justify-center gap-3">
                      <button type="button" onClick={() => setPendingFooterSectionDelete(null)} className="rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">Cancel</button>
                      <button type="button" onClick={deleteFooterSection} className="rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700">Delete</button>
                    </div>
                  </div>
                </div>,
                document.body,
              )}

            {pendingBannerSlideDelete &&
              createPortal(
                <div className="fixed inset-0 z-[10030] flex items-center justify-center bg-slate-950/45 px-4">
                  <div
                    role="alertdialog"
                    aria-modal="true"
                    aria-labelledby="delete-banner-slide-title"
                    className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-2xl"
                  >
                    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-600">
                      <Trash size={20} />
                    </div>
                    <h3
                      id="delete-banner-slide-title"
                      className="mt-4 text-xl font-semibold text-slate-950"
                    >
                      {(activeBannerData?.bannerSlides ?? []).length <= 1
                        ? "Hide banner section?"
                        : "Delete this slide?"}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {(activeBannerData?.bannerSlides ?? []).length <= 1
                        ? `“${pendingBannerSlideDelete.label}” is the last slide. Deleting it will hide the Banner section.`
                        : `“${pendingBannerSlideDelete.label}” will be removed from this banner.`}
                    </p>
                    <div className="mt-6 flex justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => setPendingBannerSlideDelete(null)}
                        className="rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={confirmPendingBannerSlideDelete}
                        className="rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700"
                      >
                        {(activeBannerData?.bannerSlides ?? []).length <= 1
                          ? "Hide Banner"
                          : "Delete"}
                      </button>
                    </div>
                  </div>
                </div>,
                document.body,
              )}

            {pendingNGOInstagramImageDelete &&
              createPortal(
                <div className="fixed inset-0 z-[10030] flex items-center justify-center bg-slate-950/45 px-4">
                  <div
                    role="alertdialog"
                    aria-modal="true"
                    aria-labelledby="delete-ngo-instagram-image-title"
                    className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-2xl"
                  >
                    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-600">
                      <Trash size={20} />
                    </div>
                    <h3
                      id="delete-ngo-instagram-image-title"
                      className="mt-4 text-xl font-semibold text-slate-950"
                    >
                      Delete this image?
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      “{pendingNGOInstagramImageDelete.label}” will be removed
                      from the About side panel gallery.
                    </p>
                    <div className="mt-6 flex justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => setPendingNGOInstagramImageDelete(null)}
                        className="rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={confirmPendingNGOInstagramImageDelete}
                        className="rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>,
                document.body,
              )}

            {pendingNGOPopupSocialLinkDelete &&
              createPortal(
                <div className="fixed inset-0 z-[10030] flex items-center justify-center bg-slate-950/45 px-4">
                  <div
                    role="alertdialog"
                    aria-modal="true"
                    aria-labelledby="delete-ngo-popup-social-title"
                    className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-2xl"
                  >
                    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-600">
                      <Trash size={20} />
                    </div>
                    <h3
                      id="delete-ngo-popup-social-title"
                      className="mt-4 text-xl font-semibold text-slate-950"
                    >
                      Delete this social icon?
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      “{pendingNGOPopupSocialLinkDelete.label}” will be removed
                      from the About side panel.
                    </p>
                    <div className="mt-6 flex justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => setPendingNGOPopupSocialLinkDelete(null)}
                        className="rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={confirmPendingNGOPopupSocialLinkDelete}
                        className="rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>,
                document.body,
              )}

            {activeSectionType === "Footer" &&
              activeTab === "External Link" && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <label className="block text-sm font-semibold text-gray-900">
                        WhatsApp Link
                      </label>
                      {activeFooterData?.whatsappLink ? (
                        <button
                          type="button"
                          onClick={() =>
                            updateFooterExternalLink("whatsappLink", "")
                          }
                          className="rounded-md border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            updateFooterExternalLink(
                              "whatsappLink",
                              DEFAULT_WHATSAPP_LINK,
                            )
                          }
                          className="rounded-md border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                        >
                          Add
                        </button>
                      )}
                    </div>
                    <input
                      value={activeFooterData?.whatsappLink ?? ""}
                      onChange={(event) =>
                        updateFooterExternalLink(
                          "whatsappLink",
                          event.target.value,
                        )
                      }
                      className="mt-2 h-11 w-full rounded-lg border border-gray-300 px-4 text-sm text-gray-900 outline-none focus:border-blue-600"
                      placeholder="https://api.whatsapp.com/send?phone=962786336414"
                    />
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <label className="block text-sm font-semibold text-gray-900">
                        Call Link
                      </label>
                      {activeFooterData?.callLink ? (
                        <button
                          type="button"
                          onClick={() => updateFooterExternalLink("callLink", "")}
                          className="rounded-md border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            updateFooterExternalLink(
                              "callLink",
                              DEFAULT_CALL_LINK,
                            )
                          }
                          className="rounded-md border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                        >
                          Add
                        </button>
                      )}
                    </div>
                    <input
                      value={activeFooterData?.callLink ?? ""}
                      onChange={(event) =>
                        updateFooterExternalLink("callLink", event.target.value)
                      }
                      className="mt-2 h-11 w-full rounded-lg border border-gray-300 px-4 text-sm text-gray-900 outline-none focus:border-blue-600"
                      placeholder="tel:+919876543210"
                    />
                  </div>
                </div>
              )}

            {activeSectionType === "Header" &&
              activeTab === "Navigation Menu" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="mt-1 text-xs text-gray-700 underline">
                        You can add up to {MAX_MENU_LINKS} menu links.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={addMenuItem}
                      disabled={menuItems.length >= MAX_MENU_LINKS}
                      className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-xs font-medium text-white disabled:bg-gray-300"
                    >
                      <Plus size={14} />
                      Add Nav Links
                    </button>
                  </div>

                  <div className="space-y-3">
                    {menuItems.map((item, index) => (
                      <div
                        key={index}
                        draggable={false}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => {
                          if (draggedIndex !== null) {
                            moveMenuItem(draggedIndex, index);
                            setDraggedIndex(null);
                          }
                        }}
                        onDragEnd={() => setDraggedIndex(null)}
                        className={`cursor-grab rounded-xl border border-gray-300 bg-white p-2 shadow-sm ${draggedIndex === index ? "opacity-50" : ""
                          }`}
                      >
                        <div className="grid grid-cols-1 gap-2 lg:grid-cols-[2.5rem_minmax(8rem,1fr)_minmax(8rem,1fr)_7rem_3.25rem] lg:items-center">
                          <button
                            type="button"
                            draggable
                            onDragStart={() => setDraggedIndex(index)}
                            onDragEnd={() => setDraggedIndex(null)}
                            className="h-9 w-9 cursor-grab rounded-lg border border-gray-400 bg-white bg-[radial-gradient(circle_at_35%_35%,#6b7280_2px,transparent_2.5px),radial-gradient(circle_at_65%_35%,#6b7280_2px,transparent_2.5px),radial-gradient(circle_at_35%_65%,#6b7280_2px,transparent_2.5px),radial-gradient(circle_at_65%_65%,#6b7280_2px,transparent_2.5px)] px-2 py-2 text-transparent active:cursor-grabbing"
                            title="Drag menu item"
                          >
                            ⋮⋮
                          </button>

                          <input
                            value={item.label}
                            onChange={(e) =>
                              updateMenuItem(index, "label", e.target.value)
                            }
                            className="h-11 rounded-lg border border-gray-400 px-4 text-sm text-blue-700 outline-none focus:border-blue-600"
                            placeholder="Menu label"
                          />

                          <input
                            value={item.href}
                            onChange={(e) =>
                              updateMenuItem(index, "href", e.target.value)
                            }
                            className="h-11 rounded-lg border border-gray-400 px-4 text-sm text-blue-700 outline-none focus:border-blue-600"
                            placeholder="/link"
                          />

                          <button
                            type="button"
                            onPointerDown={(event) => event.stopPropagation()}
                            onClick={() => addDropdownItem(index)}
                            disabled={
                              (item.children?.length ?? 0) >= MAX_DROPDOWN_LINKS
                            }
                            style={{ fontSize: "13px" }}
                            className="h-11 whitespace-nowrap rounded-lg border border-blue-500 bg-white px-3 font-medium leading-tight text-blue-600 disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-gray-100 disabled:text-gray-400"
                          >
                            Add Dropdown
                          </button>

                          <button
                            type="button"
                            onClick={() => deleteMenuItem(index)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-500 bg-white text-red-600"
                            aria-label="Delete menu item"
                          >
                            <Trash size={18} />
                          </button>
                        </div>

                        {!!item.children?.length && (
                          <div className="mt-2 space-y-2 lg:pl-[3.75rem]">
                            {item.children.map((child, childIndex) => (
                              <div
                                key={childIndex}
                                className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(10rem,1fr)_minmax(10rem,1fr)_3.5rem]"
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
                                  className="h-11 rounded-lg border border-gray-300 px-4 text-sm outline-none focus:border-blue-600"
                                  placeholder="Dropdown label"
                                />

                                <input
                                  value={child.href}
                                  onChange={(e) =>
                                    updateDropdownItem(
                                      index,
                                      childIndex,
                                      "href",
                                      e.target.value,
                                    )
                                  }
                                  className="h-11 rounded-lg border border-gray-300 px-4 text-sm outline-none focus:border-blue-600"
                                  placeholder="/dropdown-link"
                                />

                                <button
                                  type="button"
                                  onClick={() =>
                                    deleteDropdownItem(index, childIndex)
                                  }
                                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-500 bg-white text-red-600"
                                  aria-label="Delete dropdown item"
                                >
                                  <Trash size={18} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        <p className="mt-2 text-xs text-gray-500">
                          {item.children?.length ?? 0}/{MAX_DROPDOWN_LINKS}{" "}
                          dropdown links added
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
          </main>
        </div>

        <div className="shrink-0 flex justify-end gap-3 border-t border-gray-400 bg-[#f4f4f5] p-2">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-gray-400 px-5 py-2 text-sm font-semibold text-gray-600"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleDone}
              className="rounded-full border bg-white px-5 py-2 text-sm font-semibold text-green-700 shadow-sm"
            >
              Done
            </button>
          </div>
        </div>
      </div>

      {generationText && (
        <div className="fixed inset-0 z-[10002] flex items-center justify-center bg-white/35 backdrop-blur-sm">
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
    <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1 text-sm">
      {items.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => setActiveTab(item)}
          className={`w-full rounded-md px-3 py-2 text-left cursor-pointer ${activeTab === item
            ? "bg-blue-50 font-medium text-blue-700"
            : "hover:bg-gray-100"
            }`}
        >
          {item}
        </button>
      ))}
    </div>
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
}) {
  return (
    <section className="rounded-xl bg-[#f4f4f5] px-4 py-3">
      <div className="grid gap-4 border-b border-gray-300 pb-3 lg:grid-cols-[minmax(150px,1fr)_auto] lg:items-center">
        <div className="min-w-0">
          <h4 className="text-lg font-semibold text-gray-950">{title}</h4>
          <p className="mt-1 text-sm font-medium text-gray-500">
            Customize {title.toLowerCase()} settings
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-[auto_auto_auto] sm:items-center">
          {sectionTypeLabel && stickyType && onStickyTypeChange && (
            <>
              <span className="text-sm font-semibold text-gray-950 sm:whitespace-nowrap">
                {sectionTypeLabel} :
              </span>

              {(["scroll", "sticky"] as const).map((type) => {
                const isActive = stickyType === type;

                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => onStickyTypeChange(type)}
                    className={`h-10 min-w-28 rounded-xl border px-5 text-sm font-semibold capitalize text-gray-950 shadow-sm transition ${isActive
                      ? "border-gray-300 bg-white"
                      : "border-transparent bg-slate-200 hover:bg-white"
                      }`}
                  >
                    {type}
                  </button>
                );
              })}
            </>
          )}

          <span className="text-sm font-semibold text-gray-950 sm:whitespace-nowrap">
            Background Type :
          </span>

          {(["solid", "gradient"] as const).map((type) => {
            const isActive = backgroundType === type;

            return (
              <button
                key={type}
                type="button"
                onClick={() => onBackgroundTypeChange(type)}
                className={`h-10 min-w-28 rounded-xl border px-5 text-sm font-semibold capitalize text-gray-950 shadow-sm transition ${isActive
                  ? "border-gray-300 bg-white"
                  : "border-gray-500 bg-transparent hover:bg-white"
                  }`}
              >
                {type}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
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
    </section>
  );
}

function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <label className="flex min-w-0 cursor-pointer items-center gap-3 text-sm font-semibold text-gray-950">
      <span className="shrink-0">{label}</span>
      <span className="flex items-center gap-2">
        <span
          className="h-5 w-5 rounded-full border-2 border-gray-400"
          style={{ background: value }}
        />
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-8 w-8 cursor-pointer rounded border-0 bg-transparent p-0"
          aria-label={label}
        />
      </span>
    </label>
  );
}
