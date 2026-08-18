import { SYRIA_GOVERNORATE_PATHS } from './syriaPaths';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { getListMyOrdersQueryKey, setAuthTokenGetter, useCreateOrder, useListMyOrders, type OrderItem } from '@workspace/api-client-react';
import { ClerkProvider, SignIn, SignUp, useAuth, useClerk, useUser } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { arSA } from '@clerk/localizations';
import { shadcn } from '@clerk/themes';
import { createContext, type PropsWithChildren, useContext, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, ArrowRight, BadgeCheck, Check, ChevronDown, ChevronLeft, ChevronRight,
  Armchair, Boxes, Building2, Clock3, DoorOpen, Droplets, Factory, Flame, Hammer, Heart, Layers, LayoutGrid,
  type LucideIcon, MapPin, Menu, Minus, PackageCheck, Paintbrush, Plus, Route as RouteIcon, Search,
  ShieldCheck, ShoppingBag, SlidersHorizontal, Sparkles, Star, Sun, Thermometer, TreePine, Trees, Truck, UserRound, Waves, X, Zap
} from 'lucide-react';
import { Link, Route, Switch, Router as WouterRouter, useLocation, useRoute } from 'wouter';
import { RiWhatsappLine } from 'react-icons/ri';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();

// REQUIRED — copy verbatim. Resolves the key from window.location.hostname.
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

// REQUIRED — empty in dev (intentional), auto-set in prod. Do not gate.
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || '/' : path;
}

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY');
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/images/mawadak-logo.png`,
  },
  variables: {
    colorPrimary: '#bc8e46',
    colorForeground: '#262626',
    colorMutedForeground: '#77807c',
    colorDanger: '#dc2626',
    colorBackground: '#ffffff',
    colorInput: '#ffffff',
    colorInputForeground: '#262626',
    colorNeutral: '#262626',
    fontFamily: "'Cairo', sans-serif",
    borderRadius: '0.75rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-white border border-[#e5e7eb] shadow-lg rounded-2xl w-[440px] max-w-full overflow-hidden',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'text-[#262626] font-extrabold',
    headerSubtitle: 'text-[#77807c]',
    socialButtonsBlockButtonText: 'text-[#262626] font-bold',
    formFieldLabel: 'text-[#262626] font-bold',
    footerActionLink: 'text-[#bc8e46] font-bold hover:text-[#9a7034]',
    footerActionText: 'text-[#77807c]',
    dividerText: 'text-[#9ca3af]',
    identityPreviewEditButton: 'text-[#bc8e46]',
    formFieldSuccessText: 'text-[#39815c]',
    alertText: 'text-[#262626]',
    logoBox: 'justify-center',
    logoImage: 'h-10',
    socialButtonsBlockButton: 'border border-[#e5e7eb] bg-white hover:bg-[#f9fafb]',
    formButtonPrimary: 'bg-[#bc8e46] hover:bg-[#9a7034] text-white font-extrabold',
    formFieldInput: 'border border-[#d1d5db] focus:border-[#bc8e46] bg-white text-[#262626]',
    footerAction: 'justify-center',
    dividerLine: 'bg-[#e5e7eb]',
    alert: 'border border-[#e5e7eb] bg-[#f9fafb]',
    otpCodeFieldInput: 'border border-[#d1d5db] text-[#262626]',
    formFieldRow: 'gap-2',
    main: 'gap-5',
  },
};

type Product = {
  id: string; name: string; category: string; categoryLabel: string; price: number;
  oldPrice?: number; priceUSD?: number; unit: string; image: string; badge?: string; rating: string;
  brand?: string; subcategory?: string; stock?: string; specs?: string;
};

const categories = [
  { id: 'raw', name: 'مواد خام', sub: 'أسمنت، حديد، طوب', image: '/images/category-raw.jpg' },
  { id: 'health', name: 'الصحية', sub: 'خلاطات، أطقم، إكسسوارات', image: '/images/category-health.jpg' },
  { id: 'paint', name: 'التشطيبات والديكور', sub: 'ألوان، معجون، أدوات', image: '/images/category-paint.jpg' },
  { id: 'tools', name: 'معدات وأدوات البناء', sub: 'معدات احترافية للموقع', image: '/images/product-drill.jpg' },
  { id: 'electric', name: 'الكهرباء والإنارة', sub: 'لوحات، قواطع، تمديدات', image: '/images/product-electric.jpg' },
  { id: 'structure', name: 'الهيكل الإنشائي', sub: 'عوارض، أعمدة، قوالب', image: '/images/category-raw.jpg' },
  { id: 'insulation', name: 'العزل', sub: 'عزل حراري، مائي، صوتي', image: '/images/category-raw.jpg' },
  { id: 'kitchen', name: 'المطابخ والحمامات والأثاث', sub: 'خزائن، طاولات، إكسسوارات', image: '/images/category-health.jpg' },
  { id: 'safety', name: 'أنظمة السلامة والتيار الضعيف', sub: 'إنذار، مراقبة، تحكم', image: '/images/product-electric.jpg' },
  { id: 'garden', name: 'تنسيق الحدائق والأعمال الخارجية', sub: 'بلاط، ري، إنارة خارجية', image: '/images/category-paint.jpg' },
  { id: 'solar', name: 'الطاقة النظيفة والشحن الكهربائي', sub: 'ألواح شمسية، بطاريات، انفرتر', image: '/images/product-electric.jpg' },
  { id: 'metals', name: 'الحديد والمعادن والبلاستيك', sub: 'مقاطع، صفائح، أنابيب', image: '/images/category-raw.jpg' },
  { id: 'timber', name: 'الأخشاب والتجارة', sub: 'MDF، صنوبر، باركيه', image: '/images/category-paint.jpg' },
  { id: 'doors', name: 'الأبواب والنوافذ والزجاج', sub: 'أبواب، نوافذ، زجاج مزدوج', image: '/images/category-raw.jpg' },
  { id: 'hvac', name: 'التدفئة والتكييف', sub: 'مكيفات، رادياتور، مراوح', image: '/images/product-drill.jpg' },
  { id: 'infra', name: 'الطرق والجسور والبنية التحتية', sub: 'أسفلت، أنابيب خرسانية', image: '/images/category-raw.jpg' },
  { id: 'water', name: 'المياه والمرافق المتخصصة', sub: 'فلاتر، معالجة مياه، طلمبات', image: '/images/category-health.jpg' },
];

// قائمة الفئات الكاملة بنمط موادك
const drawerCategories: { id?: string; name: string; icon: LucideIcon }[] = [
  { id: 'raw',       name: 'مواد خام',                          icon: Boxes },
  { id: 'structure', name: 'الهيكل الإنشائي',                   icon: Building2 },
  { id: 'insulation',name: 'العزل',                             icon: Layers },
  { id: 'health',    name: 'الصحية',                            icon: Droplets },
  { id: 'electric',  name: 'الكهرباء والإنارة',                  icon: Zap },
  { id: 'paint',     name: 'التشطيبات والديكور',                 icon: Paintbrush },
  { id: 'kitchen',   name: 'المطابخ والحمامات والأثاث',           icon: Armchair },
  { id: 'tools',     name: 'معدات وأدوات البناء',                icon: Hammer },
  { id: 'safety',    name: 'أنظمة السلامة والتيار الضعيف',       icon: ShieldCheck },
  { id: 'garden',    name: 'تنسيق الحدائق والأعمال الخارجية',    icon: Trees },
  { id: 'solar',     name: 'الطاقة النظيفة والشحن الكهربائي',    icon: Sun },
  { id: 'metals',    name: 'الحديد والمعادن والبلاستيك',          icon: Factory },
  { id: 'timber',    name: 'الأخشاب والتجارة',                   icon: TreePine },
  { id: 'doors',     name: 'الأبواب والنوافذ والزجاج',            icon: DoorOpen },
  { id: 'hvac',      name: 'التدفئة والتكييف',                   icon: Thermometer },
  { id: 'infra',     name: 'الطرق والجسور والبنية التحتية',       icon: RouteIcon },
  { id: 'water',     name: 'المياه والمرافق المتخصصة',            icon: Waves },
];

type SyrianRegion = {
  id: string;
  name: string;
  areas: string[];
  x: number;
  y: number;
};

const syrianRegions: SyrianRegion[] = [
  { id: 'damascus', name: 'دمشق', areas: ['دمشق المدينة', 'المزة', 'برزة', 'القابون', 'ركن الدين', 'الميدان', 'كفرسوسة', 'دمر', 'باب توما'], x: 14, y: 77 },
  { id: 'rural-damascus', name: 'ريف دمشق', areas: ['دوما', 'حرستا', 'جرمانا', 'داريا', 'قطنا', 'التل', 'النبك', 'الزبداني', 'يبرود', 'قدسيا', 'صحنايا', 'عرطوز'], x: 27, y: 71.5 },
  { id: 'quneitra', name: 'القنيطرة', areas: ['القنيطرة', 'خان أرنبة', 'جباتا الخشب', 'مسعدة', 'الرفيد'], x: 9, y: 84 },
  { id: 'daraa', name: 'درعا', areas: ['درعا المدينة', 'إزرع', 'الصنمين', 'جاسم', 'بصرى الشام', 'الحراك', 'طفس', 'نوى'], x: 7, y: 92 },
  { id: 'sweida', name: 'السويداء', areas: ['السويداء المدينة', 'شهبا', 'صلخد', 'القريا', 'عرمان'], x: 25, y: 92 },
  { id: 'homs', name: 'حمص', areas: ['حمص المدينة', 'الرستن', 'تلبيسة', 'القصير', 'تدمر', 'تلكلخ', 'المخرم', 'الحولة'], x: 24, y: 54 },
  { id: 'hama', name: 'حماة', areas: ['حماة المدينة', 'مصياف', 'محردة', 'السلمية', 'السقيلبية', 'صوران', 'طيبة الإمام'], x: 22, y: 42 },
  { id: 'tartous', name: 'طرطوس', areas: ['طرطوس المدينة', 'بانياس', 'صافيتا', 'الدريكيش', 'الشيخ بدر', 'القدموس'], x: 10.5, y: 49 },
  { id: 'latakia', name: 'اللاذقية', areas: ['اللاذقية المدينة', 'جبلة', 'القرداحة', 'الحفة', 'كسب', 'ربيعة'], x: 10.5, y: 34 },
  { id: 'idlib', name: 'إدلب', areas: ['إدلب المدينة', 'أريحا', 'جسر الشغور', 'معرة النعمان', 'سراقب', 'خان شيخون', 'الدانا', 'حارم'], x: 18, y: 29 },
  { id: 'aleppo', name: 'حلب', areas: ['حلب المدينة', 'أعزاز', 'عفرين', 'الباب', 'منبج', 'جرابلس', 'عين العرب', 'دير حافر', 'السفيرة'], x: 29, y: 19 },
  { id: 'raqqa', name: 'الرقة', areas: ['الرقة المدينة', 'تل أبيض', 'الثورة', 'عين عيسى', 'السبخة', 'معدان'], x: 50, y: 22 },
  { id: 'deir-ez-zor', name: 'دير الزور', areas: ['دير الزور المدينة', 'الميادين', 'البوكمال', 'العشارة', 'موحسن', 'الصور'], x: 69, y: 39 },
  { id: 'hasakah', name: 'الحسكة', areas: ['الحسكة المدينة', 'القامشلي', 'رأس العين', 'المالكية', 'عامودا', 'الدرباسية', 'تل تمر', 'الشدادي'], x: 84, y: 13 },
];

// صور منتجات حقيقية (packshot) مولّدة ومخزّنة محلياً
const IMG = {
  'cement-gray': '/images/products/cement-gray.jpg',
  'cement-strong': '/images/products/cement-strong.jpg',
  'cement-white': '/images/products/cement-white.jpg',
  'mortar': '/images/products/mortar.jpg',
  'lime': '/images/products/lime.jpg',
  'rebar': '/images/products/rebar.jpg',
  'mesh': '/images/products/mesh.jpg',
  'wire': '/images/products/wire.jpg',
  'brick-red': '/images/products/brick-red.jpg',
  'block-20': '/images/products/block-20.jpg',
  'block-10': '/images/products/block-10.jpg',
  'block-solid': '/images/products/block-solid.jpg',
  'sand': '/images/products/sand.jpg',
  'gravel': '/images/products/gravel.jpg',
  'membrane': '/images/products/membrane.jpg',
  'insul-xps': '/images/products/insul-xps.jpg',
  'insul-roll': '/images/products/insul-roll.jpg',
  'watercoat': '/images/products/watercoat.jpg',
  'plywood': '/images/products/plywood.jpg',
  'timber': '/images/products/timber.jpg',
  'paint-white': '/images/products/paint-white.jpg',
  'paint-satin': '/images/products/paint-satin.jpg',
  'paint-washable': '/images/products/paint-washable.jpg',
  'primer': '/images/products/primer.jpg',
  'paint-ext': '/images/products/paint-ext.jpg',
  'metal-paint': '/images/products/metal-paint.jpg',
  'varnish': '/images/products/varnish.jpg',
  'putty': '/images/products/putty.jpg',
  'roller': '/images/products/roller.jpg',
  'brushes': '/images/products/brushes.jpg',
  'tile-marble': '/images/products/tile-marble.jpg',
  'tile-beige': '/images/products/tile-beige.jpg',
  'tile-white': '/images/products/tile-white.jpg',
  'tile-outdoor': '/images/products/tile-outdoor.jpg',
  'adhesive': '/images/products/adhesive.jpg',
  'grout': '/images/products/grout.jpg',
  'faucet-black': '/images/products/faucet-black.jpg',
  'faucet-kitchen': '/images/products/faucet-kitchen.jpg',
  'sink-ceramic': '/images/products/sink-ceramic.jpg',
  'sink-steel': '/images/products/sink-steel.jpg',
  'mirror-led': '/images/products/mirror-led.jpg',
  'toilet': '/images/products/toilet.jpg',
  'toilet-wall': '/images/products/toilet-wall.jpg',
  'toilet-arabic': '/images/products/toilet-arabic.jpg',
  'bathtub': '/images/products/bathtub.jpg',
  'shower': '/images/products/shower.jpg',
  'shower-set': '/images/products/shower-set.jpg',
  'bath-acc': '/images/products/bath-acc.jpg',
  'panel': '/images/products/panel.jpg',
  'breaker': '/images/products/breaker.jpg',
  'socket': '/images/products/socket.jpg',
  'cable': '/images/products/cable.jpg',
  'led-bulb': '/images/products/led-bulb.jpg',
  'led-panel': '/images/products/led-panel.jpg',
  'pipe-ppr': '/images/products/pipe-ppr.jpg',
  'pipe-pvc': '/images/products/pipe-pvc.jpg',
  'tank': '/images/products/tank.jpg',
  'pump': '/images/products/pump.jpg',
  'drill-set': '/images/products/drill-set.jpg',
  'hammer-drill': '/images/products/hammer-drill.jpg',
  'grinder': '/images/products/grinder.jpg',
  'saw': '/images/products/saw.jpg',
  'toolbox': '/images/products/toolbox.jpg',
  'screwdrivers': '/images/products/screwdrivers.jpg',
  'tape': '/images/products/tape.jpg',
  'level': '/images/products/level.jpg',
  'hammer': '/images/products/hammer.jpg',
  'trowel': '/images/products/trowel.jpg',
  'ladder': '/images/products/ladder.jpg',
  'wheelbarrow': '/images/products/wheelbarrow.jpg',
  // ─── الهيكل الإنشائي ───
  'steel-beam': '/images/products/steel-beam.jpg',
  'steel-column': '/images/products/steel-column.jpg',
  'steel-angle': '/images/products/steel-angle.jpg',
  'form-plywood': '/images/products/form-plywood.jpg',
  'steel-prop': '/images/products/steel-prop.jpg',
  // ─── العزل ───
  'insul-foam': '/images/products/insul-foam.jpg',
  'insul-sound': '/images/products/insul-sound.jpg',
  'tape-butyl': '/images/products/tape-butyl.jpg',
  // ─── المطابخ والأثاث ───
  'kitchen-cab': '/images/products/kitchen-cab.jpg',
  'kitchen-top': '/images/products/kitchen-top.jpg',
  'bath-vanity': '/images/products/bath-vanity.jpg',
  'wardrobe': '/images/products/wardrobe.jpg',
  // ─── السلامة والتيار الضعيف ───
  'smoke-detector': '/images/products/smoke-detector.jpg',
  'fire-panel': '/images/products/fire-panel.jpg',
  'cctv-cam': '/images/products/cctv-cam.jpg',
  'access-ctrl': '/images/products/access-ctrl.jpg',
  // ─── الحدائق والأعمال الخارجية ───
  'garden-paver': '/images/products/garden-paver.jpg',
  'drip-kit': '/images/products/drip-kit.jpg',
  'garden-light': '/images/products/garden-light.jpg',
  'garden-hose': '/images/products/garden-hose.jpg',
  // ─── الطاقة النظيفة ───
  'solar-panel': '/images/products/solar-panel.jpg',
  'solar-battery': '/images/products/solar-battery.jpg',
  'solar-inverter': '/images/products/solar-inverter.jpg',
  'ev-charger': '/images/products/ev-charger.jpg',
  // ─── الحديد والمعادن والبلاستيك ───
  'steel-pipe': '/images/products/steel-pipe.jpg',
  'alum-sheet': '/images/products/alum-sheet.jpg',
  'galv-sheet': '/images/products/galv-sheet.jpg',
  'pvc-board': '/images/products/pvc-board.jpg',
  // ─── الأخشاب والتجارة ───
  'mdf-board': '/images/products/mdf-board.jpg',
  'pine-plank': '/images/products/pine-plank.jpg',
  'parquet': '/images/products/parquet.jpg',
  'melamine': '/images/products/melamine.jpg',
  // ─── الأبواب والنوافذ ───
  'steel-door': '/images/products/steel-door.jpg',
  'wood-door': '/images/products/wood-door.jpg',
  'alum-window': '/images/products/alum-window.jpg',
  'double-glass': '/images/products/double-glass.jpg',
  // ─── التدفئة والتكييف ───
  'split-ac': '/images/products/split-ac.jpg',
  'radiator': '/images/products/radiator.jpg',
  'fan-ceiling': '/images/products/fan-ceiling.jpg',
  'heater-gas': '/images/products/heater-gas.jpg',
  // ─── الطرق والبنية التحتية ───
  'asphalt-bag': '/images/products/asphalt-bag.jpg',
  'concrete-pipe': '/images/products/concrete-pipe.jpg',
  'road-barrier': '/images/products/road-barrier.jpg',
  // ─── المياه والمرافق ───
  'water-filter': '/images/products/water-filter.jpg',
  'water-softener': '/images/products/water-softener.jpg',
  'sewage-pump': '/images/products/sewage-pump.jpg',
  'water-meter': '/images/products/water-meter.jpg',
};

const baseProducts: Product[] = [
  // ─── مواد البناء: الأسمنت ───
  { id: 'cement',       name: 'أسمنت تشطيب ممتاز — طن',          category: 'raw',     categoryLabel: 'مواد خام',           subcategory: 'الأسمنت',          brand: 'موادك',          price: 1358000, priceUSD: 97, unit: 'طن',           image: '/images/products/cement-hq.jpg',   badge: 'الأكثر مبيعاً', rating: '4.9', specs: 'كيس 50 كجم — مقاومة 42.5N — طن = 20 كيس' },
  { id: 'cement-strong',name: 'أسمنت بناء قوي — طن',              category: 'raw',     categoryLabel: 'مواد خام',           subcategory: 'الأسمنت',          brand: 'موادك',          price: 1358000, priceUSD: 97, unit: 'طن', image: IMG['cement-strong'], badge: 'عرض اليوم', rating: '4.8' },
  { id: 'cement-white', name: 'أسمنت أبيض للديكور 25 كجم',          category: 'raw',     categoryLabel: 'مواد خام',           subcategory: 'الأسمنت',          brand: 'موادك',          price: 235000, unit: 'كيس',           image: IMG['cement-white'],   rating: '4.7' },
  { id: 'mortar',       name: 'مونة إسمنتية جاهزة للترميم',         category: 'raw',     categoryLabel: 'مواد خام',           subcategory: 'مواد الربط',       brand: 'بناء',         price: 210000, unit: 'كيس 25 كجم',    image: IMG['mortar'],    rating: '4.7' },
  { id: 'lime',         name: 'كلس بناء مطفأ ناعم',                 category: 'raw',     categoryLabel: 'مواد خام',           subcategory: 'مواد الربط',       brand: 'بناء',         price: 115000, unit: 'كيس 25 كجم',    image: IMG['lime'],      rating: '4.5' },
  // ─── مواد البناء: الحديد ───
  { id: 'rebar',        name: 'حديد تسليح — طن',             category: 'raw',     categoryLabel: 'مواد خام',           subcategory: 'الحديد',           brand: 'موادك',        price: 6986000, priceUSD: 499, unit: 'طن',            image: '/images/products/rebar-hq.jpg',    badge: 'سعر مشروع', rating: '4.8', specs: 'قطر 12 ملم — قضيب 12 متر — درجة B500B' },
  { id: 'rebar-10',     name: 'حديد تسليح 10 ملم — طن',             category: 'raw',     categoryLabel: 'مواد خام',           subcategory: 'الحديد',           brand: 'موادك',        price: 6986000, priceUSD: 499, unit: 'طن',            image: IMG['rebar'],    rating: '4.7' },
  { id: 'steel-8',      name: 'حديد تسليح 8 ملم — طن',              category: 'raw',     categoryLabel: 'مواد خام',           subcategory: 'الحديد',           brand: 'موادك',        price: 6986000, priceUSD: 499, unit: 'طن',            image: IMG['rebar'],    rating: '4.7' },
  { id: 'steel-14',     name: 'حديد تسليح 14 ملم — طن',             category: 'raw',     categoryLabel: 'مواد خام',           subcategory: 'الحديد',           brand: 'موادك',        price: 6986000, priceUSD: 499, unit: 'طن',            image: IMG['rebar'],    rating: '4.8' },
  { id: 'steel-wire',   name: 'شبك تسليح معدني 6 ملم',              category: 'raw',     categoryLabel: 'مواد خام',           subcategory: 'الحديد',           brand: 'الشرق',        price: 385000, unit: 'طن',            image: IMG['mesh'],    rating: '4.6' },
  { id: 'binding-wire', name: 'سلك ربط حديد أسود',                  category: 'raw',     categoryLabel: 'مواد خام',           subcategory: 'الحديد',           brand: 'الشرق',        price: 165000, unit: 'بالة 25 كجم',   image: IMG['wire'],      rating: '4.5' },
  // ─── مواد البناء: البلوك والطوب ───
  { id: 'blocks',       name: 'بلوك إسمنتي مفرغ 20 سم',             category: 'raw',     categoryLabel: 'مواد خام',           subcategory: 'البلوك والطوب',    brand: 'موادك',          price: 4200, priceUSD: 0.30, unit: 'قطعة',          image: '/images/products/blocks-hq.jpg',     rating: '4.6', specs: 'الأبعاد 40×20×20 سم — وزن 12 كجم — مفرغ ثنائي — الربطة 100 حبة' },
  { id: 'hollow-block-10',name:'بلوك إسمنتي مفرغ 10 سم',            category: 'raw',     categoryLabel: 'مواد خام',           subcategory: 'البلوك والطوب',    brand: 'موادك',          price: 4200, priceUSD: 0.30, unit: 'قطعة',          image: IMG['block-10'],    rating: '4.6', specs: 'الأبعاد 40×20×10 سم — وزن 8 كجم — الربطة 100 حبة' },
  { id: 'solid-block',  name: 'بلوك إسمنتي مصمت 20 سم',             category: 'raw',     categoryLabel: 'مواد خام',           subcategory: 'البلوك والطوب',    brand: 'موادك',          price: 17500,  unit: 'قطعة',          image: IMG['block-solid'],   rating: '4.7', specs: 'الأبعاد 40×20×20 سم — وزن 16 كجم — مصمت — الربطة 100 حبة' },
  { id: 'red-brick',    name: 'طوب أحمر مفرغ 13 سم',                category: 'raw',     categoryLabel: 'مواد خام',           subcategory: 'البلوك والطوب',    brand: 'موادك',          price: 12500,  unit: 'قطعة',          image: IMG['brick-red'],    badge: 'الأكثر طلباً', rating: '4.8', specs: 'الأبعاد 24×11.5×6.5 سم — مفرغ — الربطة 100 حبة' },
  // ─── مواد البناء: الرمل والبحص ───
  { id: 'sand',         name: 'رمل مغسول ناعم — متر مكعب',             category: 'raw',     categoryLabel: 'مواد خام',           subcategory: 'الرمل والبحص',     brand: 'موادك',          price: 98000, priceUSD: 7, unit: 'متر مكعب',      image: '/images/products/sand-hq.jpg',      rating: '4.6', specs: 'رمل مغسول ناعم — وزن المتر 1.6 طن — مناسب للبناء والتشطيب' },
  { id: 'gravel',       name: 'بحص تكسير قياس 12 ملم',              category: 'raw',     categoryLabel: 'مواد خام',           subcategory: 'الرمل والبحص',     brand: 'موادك',          price: 245000, unit: 'متر مكعب',      image: IMG['gravel'],    rating: '4.6' },
  // ─── مواد البناء: العزل ───
  { id: 'membrane',     name: 'رول عازل مائي بيتومين',              category: 'raw',     categoryLabel: 'مواد خام',           subcategory: 'العزل',            brand: 'عازل',         price: 680000, unit: 'رول 10 متر',    image: IMG['membrane'],  rating: '4.6' },
  { id: 'insulation-board',name:'ألواح عزل حراري XPS سماكة 5 سم',  category: 'raw',     categoryLabel: 'مواد خام',           subcategory: 'العزل',            brand: 'عازل',         price: 185000, oldPrice: 220000, unit: 'لوح', image: IMG['insul-xps'], badge: 'عرض', rating: '4.8' },
  { id: 'insulation-roll',name:'رول عزل حراري فايبرغلاس',           category: 'raw',     categoryLabel: 'مواد خام',           subcategory: 'العزل',            brand: 'عازل',         price: 425000, unit: 'رول',           image: IMG['insul-roll'],  rating: '4.6' },
  { id: 'waterproof-coat',name:'دهان عازل مائي للأسطح 20 كجم',      category: 'raw',     categoryLabel: 'مواد خام',           subcategory: 'العزل',            brand: 'عازل',         price: 560000, unit: 'دلو',           image: IMG['watercoat'], rating: '4.7' },
  // ─── مواد البناء: الأخشاب ───
  { id: 'wood-plywood', name: 'بديل الخشب — لوح',               category: 'raw',     categoryLabel: 'مواد خام',           subcategory: 'الأخشاب',          brand: 'موادك',          price: 42000, priceUSD: 3, unit: 'لوح',           image: '/images/products/wood-hq.jpg',     rating: '4.5', specs: 'الأبعاد 244×122 سم — سماكة 18 ملم — MDF مغلف' },
  { id: 'wood-beam',    name: 'خشب قري جذل للقوالب',                category: 'raw',     categoryLabel: 'مواد خام',           subcategory: 'الأخشاب',          brand: 'موادك',          price: 285000, unit: 'قطعة',          image: IMG['timber'],     rating: '4.5' },
  // ─── الدهانات والتشطيبات ───
  { id: 'paint',        name: 'دهان داخلي مطفي — أبيض ناصع',        category: 'paint',   categoryLabel: 'التشطيبات والديكور',  subcategory: 'الدهانات الداخلية',brand: 'موادك كولور',    price: 860000, oldPrice: 1040000, unit: 'جالون 18 لتر', image: IMG['paint-white'], badge: 'عرض اليوم', rating: '4.8' },
  { id: 'paint-satin',  name: 'دهان داخلي نصف لمعة — أبيض',         category: 'paint',   categoryLabel: 'التشطيبات والديكور',  subcategory: 'الدهانات الداخلية',brand: 'موادك كولور',    price: 925000, unit: 'جالون 18 لتر',  image: IMG['paint-satin'],    rating: '4.8' },
  { id: 'paint-colors', name: 'دهان داخلي قابل للغسل — رمادي',      category: 'paint',   categoryLabel: 'التشطيبات والديكور',  subcategory: 'الدهانات الداخلية',brand: 'موادك كولور',    price: 980000, unit: 'جالون 18 لتر',  image: IMG['paint-washable'],    rating: '4.7' },
  { id: 'primer',       name: 'برايمر أساس للجدران',                 category: 'paint',   categoryLabel: 'التشطيبات والديكور',  subcategory: 'الدهانات الداخلية',brand: 'موادك كولور',    price: 475000, unit: 'جالون 18 لتر',  image: IMG['primer'],    rating: '4.6' },
  { id: 'paint-exterior',name:'دهان خارجي مقاوم للعوامل',            category: 'paint',   categoryLabel: 'التشطيبات والديكور',  subcategory: 'الدهانات الخارجية',brand: 'موادك كولور',    price: 990000, unit: 'جالون 18 لتر',  image: IMG['paint-ext'],    rating: '4.7' },
  { id: 'metal-paint',  name: 'دهان حماية للحديد والأبواب',          category: 'paint',   categoryLabel: 'التشطيبات والديكور',  subcategory: 'الدهانات الخارجية',brand: 'موادك كولور',    price: 380000, unit: 'جالون 4 لتر',   image: IMG['metal-paint'],    rating: '4.7' },
  { id: 'wood-paint',   name: 'ورنيش حماية للخشب شفاف',             category: 'paint',   categoryLabel: 'التشطيبات والديكور',  subcategory: 'دهانات الخشب',     brand: 'موادك كولور',    price: 295000, unit: 'جالون 4 لتر',   image: IMG['varnish'],    rating: '4.6' },
  { id: 'putty',        name: 'معجون جدران ناعم للتشطيب',            category: 'paint',   categoryLabel: 'التشطيبات والديكور',  subcategory: 'المعاجين',          brand: 'بناء',         price: 330000, unit: 'كيس 20 كجم',    image: IMG['putty'],    rating: '4.5' },
  { id: 'paint-roller', name: 'رول دهان احترافي مع يد',              category: 'paint',   categoryLabel: 'التشطيبات والديكور',  subcategory: 'أدوات الدهان',      brand: 'موادك تولز',     price: 85000,  unit: 'طقم',           image: IMG['roller'],    rating: '4.5' },
  { id: 'brush-set',    name: 'طقم فرش دهان 5 قطع',                  category: 'paint',   categoryLabel: 'التشطيبات والديكور',  subcategory: 'أدوات الدهان',      brand: 'موادك تولز',     price: 65000,  unit: 'طقم',           image: IMG['brushes'],    rating: '4.5' },
  { id: 'tiles',        name: 'بلاط بورسلان رخامي بيج',              category: 'paint',   categoryLabel: 'التشطيبات والديكور',  subcategory: 'البلاط',            brand: 'موادك ديكور',    price: 285000, oldPrice: 330000, unit: 'متر مربع', image: '/images/products/marble-hq.jpg', badge: 'عرض الأسبوع', rating: '4.7', specs: 'مقاس 60×120 سم — سماكة 9 ملم — لمعة عالية — مقاوم للخدش' },
  { id: 'tile-floor',   name: 'بلاط أرضيات سيراميك بيج 60×60',      category: 'paint',   categoryLabel: 'التشطيبات والديكور',  subcategory: 'البلاط',            brand: 'موادك ديكور',    price: 175000, unit: 'متر مربع',      image: IMG['tile-beige'],    rating: '4.7' },
  { id: 'tile-wall',    name: 'بلاط جدران أبيض 30×60',               category: 'paint',   categoryLabel: 'التشطيبات والديكور',  subcategory: 'البلاط',            brand: 'موادك ديكور',    price: 145000, unit: 'متر مربع',      image: IMG['tile-white'],    rating: '4.6' },
  { id: 'tile-outdoor', name: 'بلاط خارجي خشن مقاوم للانزلاق',      category: 'paint',   categoryLabel: 'التشطيبات والديكور',  subcategory: 'البلاط',            brand: 'موادك ديكور',    price: 195000, unit: 'متر مربع',      image: IMG['tile-outdoor'],    badge: 'جديد', rating: '4.7' },
  { id: 'adhesive',     name: 'لاصق بلاط إسمنتي مرن',               category: 'paint',   categoryLabel: 'التشطيبات والديكور',  subcategory: 'مواد اللصق',        brand: 'بناء',         price: 195000, unit: 'كيس 20 كجم',    image: IMG['adhesive'],   rating: '4.6' },
  { id: 'grout',        name: 'فواصل بلاط ملونة 2 كجم',              category: 'paint',   categoryLabel: 'التشطيبات والديكور',  subcategory: 'مواد اللصق',        brand: 'بناء',         price: 48000,  unit: 'كيس',           image: IMG['grout'],      rating: '4.5' },
  // ─── الأدوات الصحية ───
  { id: 'faucet',       name: 'خلاط مغسلة جداري أسود مطفي',         category: 'health',  categoryLabel: 'الصحية',        subcategory: 'الخلاطات',          brand: 'موادك هوم',      price: 1790000, unit: 'قطعة',         image: IMG['faucet-black'],   badge: 'جديد', rating: '4.9' },
  { id: 'kitchen-faucet',name:'خلاط مطبخ مرن كروم',                  category: 'health',  categoryLabel: 'الصحية',        subcategory: 'الخلاطات',          brand: 'موادك هوم',      price: 1250000, unit: 'قطعة',         image: IMG['faucet-kitchen'],   rating: '4.8' },
  { id: 'sink',         name: 'مغسلة سيراميك سطحية فاخرة',           category: 'health',  categoryLabel: 'الصحية',        subcategory: 'المغاسل',           brand: 'موادك هوم',      price: 1350000, unit: 'قطعة',         image: IMG['sink-ceramic'],     rating: '4.9' },
  { id: 'kitchen-sink', name: 'جلي ستانلس ستيل حوضين',              category: 'health',  categoryLabel: 'الصحية',        subcategory: 'المغاسل',           brand: 'موادك هوم',      price: 1180000, unit: 'قطعة',         image: IMG['sink-steel'],     rating: '4.7' },
  { id: 'mirror',       name: 'مرآة حمام بإضاءة LED',                category: 'health',  categoryLabel: 'الصحية',        subcategory: 'المغاسل',           brand: 'موادك هوم',      price: 1450000, unit: 'قطعة',         image: IMG['mirror-led'],    badge: 'جديد', rating: '4.8' },
  { id: 'toilet',       name: 'كرسي حمام سيراميك أبيض',              category: 'health',  categoryLabel: 'الصحية',        subcategory: 'أطقم الحمامات',     brand: 'موادك هوم',      price: 2250000, unit: 'قطعة',         image: IMG['toilet'],    rating: '4.8' },
  { id: 'toilet-wall',  name: 'كرسي حمام إفرنجي جداري',              category: 'health',  categoryLabel: 'الصحية',        subcategory: 'أطقم الحمامات',     brand: 'موادك هوم',      price: 2850000, unit: 'قطعة',         image: IMG['toilet-wall'],    rating: '4.8' },
  { id: 'toilet-floor', name: 'كرسي حمام عربي سيراميك',              category: 'health',  categoryLabel: 'الصحية',        subcategory: 'أطقم الحمامات',     brand: 'موادك هوم',      price: 780000,  unit: 'قطعة',         image: IMG['toilet-arabic'],    rating: '4.6' },
  { id: 'bath-tub',     name: 'بانيو أكريليك أبيض 170 سم',           category: 'health',  categoryLabel: 'الصحية',        subcategory: 'أطقم الحمامات',     brand: 'موادك هوم',      price: 3650000, unit: 'قطعة',         image: IMG['bathtub'],   badge: 'جديد', rating: '4.8' },
  { id: 'shower',       name: 'رأس دش مطري مع خلاط',                 category: 'health',  categoryLabel: 'الصحية',        subcategory: 'الدش والإكسسوارات', brand: 'موادك هوم',      price: 980000, oldPrice: 1150000, unit: 'طقم', image: IMG['shower'], badge: 'عرض', rating: '4.7' },
  { id: 'shower-set',   name: 'طقم دش كامل مع سماعة',                category: 'health',  categoryLabel: 'الصحية',        subcategory: 'الدش والإكسسوارات', brand: 'موادك هوم',      price: 1450000, unit: 'طقم',          image: IMG['shower-set'],    rating: '4.7' },
  { id: 'bath-accessories',name:'طقم إكسسوارات حمام 6 قطع',          category: 'health',  categoryLabel: 'الصحية',        subcategory: 'الدش والإكسسوارات', brand: 'موادك هوم',      price: 620000, oldPrice: 750000, unit: 'طقم', image: IMG['bath-acc'], badge: 'عرض', rating: '4.6' },
  // ─── الكهرباء والسباكة ───
  { id: 'electric',     name: 'لوحة توزيع كهرباء 12 خط',             category: 'electric',categoryLabel: 'الكهرباء والإنارة',     subcategory: 'اللوحات والقواطع', brand: 'موادك إلكتريك',  price: 485000,  unit: 'لوحة',         image: IMG['panel'],     badge: 'جديد', rating: '4.6' },
  { id: 'electric-panel-24',name:'لوحة توزيع كهرباء 24 خط',          category: 'electric',categoryLabel: 'الكهرباء والإنارة',     subcategory: 'اللوحات والقواطع', brand: 'موادك إلكتريك',  price: 760000,  unit: 'لوحة',         image: IMG['panel'],   rating: '4.7' },
  { id: 'breaker',      name: 'قاطع حماية كهربائي 32 أمبير',         category: 'electric',categoryLabel: 'الكهرباء والإنارة',     subcategory: 'اللوحات والقواطع', brand: 'موادك إلكتريك',  price: 85000,   unit: 'قطعة',         image: IMG['breaker'],     rating: '4.7' },
  { id: 'breaker-63',   name: 'قاطع رئيسي 63 أمبير',                 category: 'electric',categoryLabel: 'الكهرباء والإنارة',     subcategory: 'اللوحات والقواطع', brand: 'موادك إلكتريك',  price: 185000,  unit: 'قطعة',         image: IMG['breaker'],   rating: '4.7' },
  { id: 'socket',       name: 'مفتاح ومقبس جداري أبيض',              category: 'electric',categoryLabel: 'الكهرباء والإنارة',     subcategory: 'المفاتيح والمقابس',brand: 'موادك إلكتريك',  price: 32000,   unit: 'قطعة',         image: IMG['socket'],      rating: '4.5' },
  { id: 'cable-2x25',   name: 'كبل كهرباء نحاس 2×2.5 مم',           category: 'electric',categoryLabel: 'الكهرباء والإنارة',     subcategory: 'الكابلات والأسلاك',brand: 'موادك إلكتريك',  price: 265000,  unit: 'لفة 100 متر',  image: IMG['cable'],     rating: '4.8' },
  { id: 'cable-3x6',    name: 'كبل كهرباء نحاس 3×6 مم',             category: 'electric',categoryLabel: 'الكهرباء والإنارة',     subcategory: 'الكابلات والأسلاك',brand: 'موادك إلكتريك',  price: 680000,  unit: 'لفة 100 متر',  image: IMG['cable'],      rating: '4.7' },
  { id: 'led-bulb',     name: 'لمبة LED اقتصادية 18 واط',            category: 'electric',categoryLabel: 'الكهرباء والإنارة',     subcategory: 'الإنارة',           brand: 'موادك إلكتريك',  price: 38000,   unit: 'قطعة',         image: IMG['led-bulb'],       badge: 'الأكثر مبيعاً', rating: '4.7' },
  { id: 'led-panel',    name: 'بانل LED سقفي دائري 24 واط',          category: 'electric',categoryLabel: 'الكهرباء والإنارة',     subcategory: 'الإنارة',           brand: 'موادك إلكتريك',  price: 72000,   unit: 'قطعة',         image: IMG['led-panel'],  rating: '4.6' },
  { id: 'water-pipe-25',name: 'أنبوب مياه PPR قياس 25 ملم',          category: 'electric',categoryLabel: 'الكهرباء والإنارة',     subcategory: 'تمديدات المياه',    brand: 'موادك بلس',      price: 18500,   unit: 'متر',          image: IMG['pipe-ppr'],      rating: '4.7' },
  { id: 'water-pipe-32',name: 'أنبوب مياه PPR قياس 32 ملم',          category: 'electric',categoryLabel: 'الكهرباء والإنارة',     subcategory: 'تمديدات المياه',    brand: 'موادك بلس',      price: 26500,   unit: 'متر',          image: IMG['pipe-ppr'],     rating: '4.7' },
  { id: 'drain-pipe',   name: 'أنبوب صرف صحي PVC قياس 4 إنش',        category: 'electric',categoryLabel: 'الكهرباء والإنارة',     subcategory: 'الصرف الصحي',       brand: 'موادك بلس',      price: 42000,   unit: 'متر',          image: IMG['pipe-pvc'],      rating: '4.6' },
  { id: 'water-tank',   name: 'خزان مياه بلاستيك 1000 لتر',          category: 'electric',categoryLabel: 'الكهرباء والإنارة',     subcategory: 'الخزانات والمضخات', brand: 'موادك بلس',      price: 2850000, unit: 'خزان',         image: IMG['tank'],      badge: 'جديد', rating: '4.8' },
  { id: 'water-pump',   name: 'مضخة مياه منزلية نصف حصان',           category: 'electric',categoryLabel: 'الكهرباء والإنارة',     subcategory: 'الخزانات والمضخات', brand: 'موادك بلس',      price: 920000,  unit: 'قطعة',         image: IMG['pump'],      rating: '4.7' },
  // ─── العدد والأدوات ───
  { id: 'drill',        name: 'طقم مثقاب لاسلكي 20 فولت',            category: 'tools',   categoryLabel: 'معدات وأدوات البناء',        subcategory: 'العدد الكهربائية',  brand: 'موادك تولز',     price: 2490000, oldPrice: 2990000, unit: 'طقم متكامل', image: IMG['drill-set'], badge: 'عرض اليوم', rating: '4.7' },
  { id: 'hammer-drill', name: 'دريل شاكوش 800 واط',                  category: 'tools',   categoryLabel: 'معدات وأدوات البناء',        subcategory: 'العدد الكهربائية',  brand: 'موادك تولز',     price: 1150000, unit: 'قطعة',         image: IMG['hammer-drill'],    rating: '4.7' },
  { id: 'grinder',      name: 'صاروخ قص وجلخ 900 واط',               category: 'tools',   categoryLabel: 'معدات وأدوات البناء',        subcategory: 'العدد الكهربائية',  brand: 'موادك تولز',     price: 690000,  unit: 'قطعة',         image: IMG['grinder'],   rating: '4.6' },
  { id: 'circular-saw', name: 'منشار دائري كهربائي 1400 واط',        category: 'tools',   categoryLabel: 'معدات وأدوات البناء',        subcategory: 'العدد الكهربائية',  brand: 'موادك تولز',     price: 1380000, unit: 'قطعة',         image: IMG['saw'],       rating: '4.6' },
  { id: 'toolbox',      name: 'صندوق عدة احترافي 148 قطعة',           category: 'tools',   categoryLabel: 'معدات وأدوات البناء',        subcategory: 'العدد اليدوية',     brand: 'موادك تولز',     price: 1850000, unit: 'صندوق',        image: IMG['toolbox'],   badge: 'الأكثر مبيعاً', rating: '4.9' },
  { id: 'screwdriver-set',name:'طقم مفكات 12 قطعة',                  category: 'tools',   categoryLabel: 'معدات وأدوات البناء',        subcategory: 'العدد اليدوية',     brand: 'موادك تولز',     price: 155000, oldPrice: 185000, unit: 'طقم', image: IMG['screwdrivers'], badge: 'عرض', rating: '4.7' },
  { id: 'measuring-tape',name:'متر قياس احترافي 5 أمتار',            category: 'tools',   categoryLabel: 'معدات وأدوات البناء',        subcategory: 'العدد اليدوية',     brand: 'موادك تولز',     price: 65000,   unit: 'قطعة',         image: IMG['tape'],   rating: '4.7' },
  { id: 'spirit-level', name: 'ميزان ماء ألمنيوم 60 سم',             category: 'tools',   categoryLabel: 'معدات وأدوات البناء',        subcategory: 'العدد اليدوية',     brand: 'موادك تولز',     price: 125000,  unit: 'قطعة',         image: IMG['level'],     rating: '4.6' },
  { id: 'hammer',       name: 'شاكوش حدادي 2 كجم',                   category: 'tools',   categoryLabel: 'معدات وأدوات البناء',        subcategory: 'العدد اليدوية',     brand: 'موادك تولز',     price: 105000,  unit: 'قطعة',         image: IMG['hammer'],    rating: '4.6' },
  { id: 'trowel',       name: 'مسطرين بناء فولاذي',                  category: 'tools',   categoryLabel: 'معدات وأدوات البناء',        subcategory: 'معدات الموقع',       brand: 'موادك تولز',     price: 45000,   unit: 'قطعة',         image: IMG['trowel'],    rating: '4.5' },
  { id: 'ladder',       name: 'سلم ألمنيوم قابل للطي 5 درجات',       category: 'tools',   categoryLabel: 'معدات وأدوات البناء',        subcategory: 'معدات الموقع',       brand: 'موادك تولز',     price: 720000,  unit: 'قطعة',         image: IMG['ladder'],    rating: '4.5' },
  { id: 'wheelbarrow',  name: 'عربة يد حديد للموقع',                 category: 'tools',   categoryLabel: 'معدات وأدوات البناء',        subcategory: 'معدات الموقع',       brand: 'موادك تولز',     price: 680000,  unit: 'قطعة',         image: IMG['wheelbarrow'],    rating: '4.6' },
  // ─── الهيكل الإنشائي ───
  { id: 'ipe-120',      name: 'عارضة حديد IPE 120 طول 6 متر',       category: 'structure', categoryLabel: 'الهيكل الإنشائي',  subcategory: 'عوارض وأعمدة',        brand: 'الشرق',        price: 320000, unit: 'قطعة',           image: IMG['steel-beam'],   badge: 'الأكثر طلباً', rating: '4.8' },
  { id: 'col-60',       name: 'عمود حديد مربع مجوف 60×60',           category: 'structure', categoryLabel: 'الهيكل الإنشائي',  subcategory: 'عوارض وأعمدة',        brand: 'الشرق',        price: 185000, unit: 'قطعة 6 متر',    image: IMG['steel-column'],  rating: '4.7' },
  { id: 'angle-50',     name: 'مقطع زاوية حديد 50×50×5',             category: 'structure', categoryLabel: 'الهيكل الإنشائي',  subcategory: 'عوارض وأعمدة',        brand: 'الشرق',        price: 265000, unit: 'طن',             image: IMG['steel-angle'],   rating: '4.7' },
  { id: 'form-ply18',   name: 'لوح خشب قالب 18 ملم للبيتون',         category: 'structure', categoryLabel: 'الهيكل الإنشائي',  subcategory: 'القوالب الخشبية',      brand: 'موادك',          price: 375000, unit: 'لوح',            image: IMG['form-plywood'],  rating: '4.6' },
  { id: 'steel-prop',   name: 'شمبر حديد قابل للتعديل',              category: 'structure', categoryLabel: 'الهيكل الإنشائي',  subcategory: 'دعامات الصب',          brand: 'موادك تولز',     price: 195000, unit: 'قطعة',           image: IMG['steel-prop'],    rating: '4.5' },
  // ─── العزل ───
  { id: 'insul-xps-50', name: 'لوح عزل حراري XPS سماكة 5 سم',       category: 'insulation', categoryLabel: 'العزل',            subcategory: 'العزل الحراري',         brand: 'عازل',         price: 185000, oldPrice: 220000, unit: 'لوح', image: IMG['insul-xps'], badge: 'عرض', rating: '4.8' },
  { id: 'insul-fg',     name: 'رول عزل حراري فايبرغلاس 5 سم',       category: 'insulation', categoryLabel: 'العزل',            subcategory: 'العزل الحراري',         brand: 'عازل',         price: 425000, unit: 'رول',            image: IMG['insul-roll'],    rating: '4.6' },
  { id: 'membr-4mm',    name: 'رول عازل مائي بيتومين 4 ملم',         category: 'insulation', categoryLabel: 'العزل',            subcategory: 'العزل المائي',          brand: 'عازل',         price: 680000, unit: 'رول 10 متر',    image: IMG['membrane'],      badge: 'الأكثر مبيعاً', rating: '4.7' },
  { id: 'water-coat',   name: 'دهان عازل مائي للأسطح 20 كجم',       category: 'insulation', categoryLabel: 'العزل',            subcategory: 'العزل المائي',          brand: 'عازل',         price: 560000, unit: 'دلو',            image: IMG['watercoat'],     rating: '4.7' },
  { id: 'sound-insul',  name: 'رول عزل صوتي مطاط 3 ملم',            category: 'insulation', categoryLabel: 'العزل',            subcategory: 'العزل الصوتي',          brand: 'عازل',         price: 285000, unit: 'رول 10 متر',    image: IMG['insul-foam'],    rating: '4.5' },
  { id: 'tape-waterp',  name: 'شريط عازل للفواصل والشقوق',           category: 'insulation', categoryLabel: 'العزل',            subcategory: 'العزل المائي',          brand: 'عازل',         price: 48000,  unit: 'لفة 10 متر',    image: IMG['tape-butyl'],    rating: '4.6' },
  // ─── المطابخ والحمامات والأثاث ───
  { id: 'kitchen-base', name: 'خزانة مطبخ سفلية 60 سم',              category: 'kitchen',  categoryLabel: 'المطابخ والحمامات والأثاث', subcategory: 'خزائن المطابخ',     brand: 'موادك هوم',      price: 1850000, unit: 'قطعة',          image: IMG['kitchen-cab'],  badge: 'جديد', rating: '4.8' },
  { id: 'kitchen-top',  name: 'طاولة مطبخ جرانيت 60×120 سم',         category: 'kitchen',  categoryLabel: 'المطابخ والحمامات والأثاث', subcategory: 'خزائن المطابخ',     brand: 'موادك هوم',      price: 3200000, unit: 'قطعة',          image: IMG['kitchen-top'],   rating: '4.7' },
  { id: 'bath-vanity',  name: 'وحدة مغسلة حمام فاخرة 80 سم',         category: 'kitchen',  categoryLabel: 'المطابخ والحمامات والأثاث', subcategory: 'وحدات الحمامات',    brand: 'موادك هوم',      price: 2750000, unit: 'قطعة',          image: IMG['bath-vanity'],   rating: '4.8' },
  { id: 'wardrobe-3d',  name: 'خزانة ملابس 3 أبواب MDF',             category: 'kitchen',  categoryLabel: 'المطابخ والحمامات والأثاث', subcategory: 'الأثاث',            brand: 'موادك هوم',      price: 4500000, unit: 'قطعة',          image: IMG['wardrobe'],      badge: 'جديد', rating: '4.7' },
  // ─── السلامة والتيار الضعيف ───
  { id: 'smoke-det',    name: 'كاشف دخان وحريق 9 فولت',              category: 'safety',   categoryLabel: 'أنظمة السلامة والتيار الضعيف', subcategory: 'الإنذار والحماية', brand: 'موادك سيف',      price: 95000,  unit: 'قطعة',           image: IMG['smoke-detector'], badge: 'الأكثر مبيعاً', rating: '4.8' },
  { id: 'fire-panel-8', name: 'لوحة إنذار حريق 8 مناطق',             category: 'safety',   categoryLabel: 'أنظمة السلامة والتيار الضعيف', subcategory: 'الإنذار والحماية', brand: 'موادك سيف',      price: 1250000, unit: 'لوحة',          image: IMG['fire-panel'],    rating: '4.7' },
  { id: 'cctv-4mp',     name: 'كاميرا مراقبة IP 4 ميغابكسل',         category: 'safety',   categoryLabel: 'أنظمة السلامة والتيار الضعيف', subcategory: 'كاميرات المراقبة', brand: 'موادك سيف',      price: 580000,  unit: 'قطعة',          image: IMG['cctv-cam'],      badge: 'جديد', rating: '4.7' },
  { id: 'nvr-8ch',      name: 'جهاز تسجيل NVR 8 كاميرات',            category: 'safety',   categoryLabel: 'أنظمة السلامة والتيار الضعيف', subcategory: 'كاميرات المراقبة', brand: 'موادك سيف',      price: 980000,  unit: 'جهاز',          image: IMG['fire-panel'],    rating: '4.6' },
  { id: 'access-door',  name: 'نظام تحكم بالدخول ببصمة',             category: 'safety',   categoryLabel: 'أنظمة السلامة والتيار الضعيف', subcategory: 'التحكم بالدخول',   brand: 'موادك سيف',      price: 1450000, unit: 'جهاز',          image: IMG['access-ctrl'],   rating: '4.6' },
  // ─── تنسيق الحدائق ───
  { id: 'paver-40',     name: 'بلاط حدائق خارجي 40×40 سم',           category: 'garden',   categoryLabel: 'تنسيق الحدائق والأعمال الخارجية', subcategory: 'البلاط الخارجي', brand: 'موادك ديكور',    price: 165000,  unit: 'متر مربع',      image: IMG['garden-paver'],  badge: 'الأكثر طلباً', rating: '4.7' },
  { id: 'drip-system',  name: 'نظام ري بالتنقيط كامل 50 متر',        category: 'garden',   categoryLabel: 'تنسيق الحدائق والأعمال الخارجية', subcategory: 'الري والسقاية',  brand: 'موادك جاردن',    price: 320000,  unit: 'طقم',           image: IMG['drip-kit'],      rating: '4.7' },
  { id: 'garden-hose',  name: 'خرطوم حديقة مقاوم 25 متر',            category: 'garden',   categoryLabel: 'تنسيق الحدائق والأعمال الخارجية', subcategory: 'الري والسقاية',  brand: 'موادك جاردن',    price: 115000,  unit: 'لفة',           image: IMG['garden-hose'],   rating: '4.6' },
  { id: 'solar-light',  name: 'مصباح حديقة شمسي LED',                category: 'garden',   categoryLabel: 'تنسيق الحدائق والأعمال الخارجية', subcategory: 'الإنارة الخارجية', brand: 'موادك جاردن',  price: 85000,   unit: 'قطعة',          image: IMG['garden-light'],  rating: '4.6' },
  { id: 'curb-stone',   name: 'حجر حافة طريق إسمنتي',                category: 'garden',   categoryLabel: 'تنسيق الحدائق والأعمال الخارجية', subcategory: 'البلاط الخارجي', brand: 'موادك',          price: 22000,   unit: 'قطعة',          image: IMG['garden-paver'],  rating: '4.5' },
  // ─── الطاقة النظيفة ───
  { id: 'solar-400w',   name: 'لوح شمسي 400 واط Mono',               category: 'solar',    categoryLabel: 'الطاقة النظيفة والشحن الكهربائي', subcategory: 'الألواح الشمسية', brand: 'موادك سولار',    price: 1650000, unit: 'لوح',           image: IMG['solar-panel'],   badge: 'جديد', rating: '4.9' },
  { id: 'battery-200',  name: 'بطارية تخزين ليثيوم 200AH',           category: 'solar',    categoryLabel: 'الطاقة النظيفة والشحن الكهربائي', subcategory: 'البطاريات',       brand: 'موادك سولار',    price: 4200000, unit: 'بطارية',        image: IMG['solar-battery'], badge: 'الأكثر مبيعاً', rating: '4.8' },
  { id: 'inverter-5k',  name: 'انفرتر هجين 5 كيلوواط',               category: 'solar',    categoryLabel: 'الطاقة النظيفة والشحن الكهربائي', subcategory: 'الانفرترات',      brand: 'موادك سولار',    price: 3850000, unit: 'جهاز',          image: IMG['solar-inverter'], rating: '4.8' },
  { id: 'ev-charger',   name: 'شاحن سيارات كهربائية 7 كيلوواط',       category: 'solar',    categoryLabel: 'الطاقة النظيفة والشحن الكهربائي', subcategory: 'شحن السيارات',    brand: 'موادك سولار',    price: 2100000, unit: 'جهاز',          image: IMG['ev-charger'],    badge: 'جديد', rating: '4.7' },
  // ─── الحديد والمعادن والبلاستيك ───
  { id: 'galv-pipe-2',  name: 'أنبوب حديد مجلفن 2 إنش',              category: 'metals',   categoryLabel: 'الحديد والمعادن والبلاستيك', subcategory: 'الأنابيب',          brand: 'الشرق',        price: 58000,   unit: 'متر',           image: IMG['steel-pipe'],    badge: 'الأكثر طلباً', rating: '4.7' },
  { id: 'alum-sheet-1', name: 'صفيحة ألمنيوم 1 ملم 1×2 متر',         category: 'metals',   categoryLabel: 'الحديد والمعادن والبلاستيك', subcategory: 'الصفائح والألواح',  brand: 'الشرق',        price: 285000,  unit: 'قطعة',          image: IMG['alum-sheet'],    rating: '4.6' },
  { id: 'galv-sheet-2', name: 'صفيحة حديد مجلفن 2 ملم',              category: 'metals',   categoryLabel: 'الحديد والمعادن والبلاستيك', subcategory: 'الصفائح والألواح',  brand: 'الشرق',        price: 340000,  unit: 'قطعة 1×2 متر', image: IMG['galv-sheet'],    rating: '4.6' },
  { id: 'pvc-board-4',  name: 'لوح PVC صلب 4 ملم للتشطيب',           category: 'metals',   categoryLabel: 'الحديد والمعادن والبلاستيك', subcategory: 'البلاستيك والـPVC', brand: 'موادك',          price: 165000,  unit: 'لوح 1×2 متر',  image: IMG['pvc-board'],     badge: 'جديد', rating: '4.6' },
  { id: 'copper-pipe',  name: 'أنبوب نحاس للتدفئة 18 ملم',           category: 'metals',   categoryLabel: 'الحديد والمعادن والبلاستيك', subcategory: 'الأنابيب',          brand: 'الشرق',        price: 42000,   unit: 'متر',           image: IMG['steel-pipe'],    rating: '4.7' },
  // ─── الأخشاب والتجارة ───
  { id: 'mdf-18',       name: 'لوح MDF ملامين أبيض 18 ملم',          category: 'timber',   categoryLabel: 'الأخشاب والتجارة', subcategory: 'ألواح الخشب',            brand: 'موادك وود',      price: 420000,  unit: 'لوح',           image: IMG['mdf-board'],     badge: 'الأكثر مبيعاً', rating: '4.8' },
  { id: 'pine-90',      name: 'خشب صنوبر 5×9 سم',                    category: 'timber',   categoryLabel: 'الأخشاب والتجارة', subcategory: 'خشب المنشرة',            brand: 'موادك وود',      price: 18500,   unit: 'متر طولي',      image: IMG['pine-plank'],    rating: '4.6' },
  { id: 'parquet-oak',  name: 'باركيه خشبي سنديان 15 ملم',           category: 'timber',   categoryLabel: 'الأخشاب والتجارة', subcategory: 'الأرضيات الخشبية',       brand: 'موادك وود',      price: 380000,  unit: 'متر مربع',      image: IMG['parquet'],       badge: 'جديد', rating: '4.8' },
  { id: 'hdf-board',    name: 'لوح HDF ضغط عالٍ 6 ملم',              category: 'timber',   categoryLabel: 'الأخشاب والتجارة', subcategory: 'ألواح الخشب',            brand: 'موادك وود',      price: 195000,  unit: 'لوح',           image: IMG['melamine'],      rating: '4.5' },
  { id: 'solid-oak',    name: 'خشب سنديان صلب للديكور',              category: 'timber',   categoryLabel: 'الأخشاب والتجارة', subcategory: 'خشب المنشرة',            brand: 'موادك وود',      price: 85000,   unit: 'متر طولي',      image: IMG['pine-plank'],    rating: '4.6' },
  // ─── الأبواب والنوافذ والزجاج ───
  { id: 'door-steel',   name: 'باب حديد خارجي مزدوج',                category: 'doors',    categoryLabel: 'الأبواب والنوافذ والزجاج', subcategory: 'الأبواب الخارجية',    brand: 'موادك دورز',     price: 3850000, unit: 'طقم',           image: IMG['steel-door'],    badge: 'الأكثر طلباً', rating: '4.8' },
  { id: 'door-wood-in', name: 'باب داخلي HDF تشطيب كامل',            category: 'doors',    categoryLabel: 'الأبواب والنوافذ والزجاج', subcategory: 'الأبواب الداخلية',    brand: 'موادك دورز',     price: 1250000, unit: 'قطعة',          image: IMG['wood-door'],     rating: '4.7' },
  { id: 'win-alum',     name: 'نافذة ألمنيوم 120×120 سم',            category: 'doors',    categoryLabel: 'الأبواب والنوافذ والزجاج', subcategory: 'النوافذ',              brand: 'موادك دورز',     price: 1680000, unit: 'قطعة',          image: IMG['alum-window'],   badge: 'جديد', rating: '4.7' },
  { id: 'glass-double', name: 'زجاج مزدوج عازل 6/12/6 ملم',          category: 'doors',    categoryLabel: 'الأبواب والنوافذ والزجاج', subcategory: 'الزجاج',               brand: 'موادك دورز',     price: 185000,  unit: 'متر مربع',      image: IMG['double-glass'],  rating: '4.8' },
  { id: 'glass-temper', name: 'زجاج مقسّى 10 ملم',                   category: 'doors',    categoryLabel: 'الأبواب والنوافذ والزجاج', subcategory: 'الزجاج',               brand: 'موادك دورز',     price: 265000,  unit: 'متر مربع',      image: IMG['double-glass'],  rating: '4.7' },
  // ─── التدفئة والتكييف ───
  { id: 'ac-24k',       name: 'مكيف سبليت 24000 BTU ديواني',          category: 'hvac',     categoryLabel: 'التدفئة والتكييف', subcategory: 'التكييف',                  brand: 'موادك كول',      price: 7200000, unit: 'طقم',           image: IMG['split-ac'],      badge: 'جديد', rating: '4.8' },
  { id: 'ac-12k',       name: 'مكيف سبليت 12000 BTU',                 category: 'hvac',     categoryLabel: 'التدفئة والتكييف', subcategory: 'التكييف',                  brand: 'موادك كول',      price: 4850000, unit: 'طقم',           image: IMG['split-ac'],      rating: '4.7' },
  { id: 'radiator-6',   name: 'رادياتور حديد زهر 6 حدوة',            category: 'hvac',     categoryLabel: 'التدفئة والتكييف', subcategory: 'التدفئة المركزية',         brand: 'موادك كول',      price: 1850000, unit: 'قطعة',          image: IMG['radiator'],      badge: 'الأكثر طلباً', rating: '4.8' },
  { id: 'fan-56',       name: 'مروحة سقف 56 إنش مع ريموت',           category: 'hvac',     categoryLabel: 'التدفئة والتكييف', subcategory: 'مراوح السقف',              brand: 'موادك كول',      price: 680000,  unit: 'قطعة',          image: IMG['fan-ceiling'],   rating: '4.6' },
  { id: 'gas-heater',   name: 'سخان غاز للمياه 10 لتر',              category: 'hvac',     categoryLabel: 'التدفئة والتكييف', subcategory: 'سخانات المياه',            brand: 'موادك كول',      price: 1150000, oldPrice: 1350000, unit: 'جهاز', image: IMG['heater-gas'], badge: 'عرض', rating: '4.7' },
  // ─── الطرق والجسور والبنية التحتية ───
  { id: 'asphalt-hot',  name: 'أسفلت ساخن للطرق الداخلية',           category: 'infra',    categoryLabel: 'الطرق والجسور والبنية التحتية', subcategory: 'مواد الطرق',        brand: 'موادك',          price: 850000,  unit: 'طن',            image: IMG['asphalt-bag'],   badge: 'سعر مشروع', rating: '4.7' },
  { id: 'concrete-c60', name: 'أنبوب خرساني مصمت 60 سم',             category: 'infra',    categoryLabel: 'الطرق والجسور والبنية التحتية', subcategory: 'الأنابيب الخرسانية', brand: 'موادك',         price: 185000,  unit: 'قطعة',          image: IMG['concrete-pipe'], rating: '4.6' },
  { id: 'barrier-je',   name: 'حاجز طريق New Jersey خرساني',          category: 'infra',    categoryLabel: 'الطرق والجسور والبنية التحتية', subcategory: 'حواجز الطرق',        brand: 'موادك',         price: 650000,  unit: 'قطعة',          image: IMG['road-barrier'],  rating: '4.6' },
  { id: 'manhole',      name: 'غطاء بئر تفتيش حديد 60×60',           category: 'infra',    categoryLabel: 'الطرق والجسور والبنية التحتية', subcategory: 'المصارف',             brand: 'موادك',         price: 285000,  unit: 'قطعة',          image: IMG['road-barrier'],  rating: '4.5' },
  // ─── المياه والمرافق المتخصصة ───
  { id: 'filter-5s',    name: 'فلتر مياه منزلي 5 مراحل RO',          category: 'water',    categoryLabel: 'المياه والمرافق المتخصصة', subcategory: 'فلاتر المياه',          brand: 'موادك بلس',      price: 1250000, unit: 'جهاز',          image: IMG['water-filter'],  badge: 'الأكثر مبيعاً', rating: '4.9' },
  { id: 'softener',     name: 'جهاز معالجة مياه ومُلين',             category: 'water',    categoryLabel: 'المياه والمرافق المتخصصة', subcategory: 'معالجة المياه',         brand: 'موادك بلس',      price: 2850000, unit: 'جهاز',          image: IMG['water-softener'], rating: '4.7' },
  { id: 'sewage-pump',  name: 'طلمبة صرف صحي غاطسة 1 حصان',          category: 'water',    categoryLabel: 'المياه والمرافق المتخصصة', subcategory: 'الطلمبات',              brand: 'موادك بلس',      price: 1450000, unit: 'قطعة',          image: IMG['sewage-pump'],   rating: '4.7' },
  { id: 'water-meter',  name: 'عداد مياه رقمي DN25',                  category: 'water',    categoryLabel: 'المياه والمرافق المتخصصة', subcategory: 'القياس والتحكم',        brand: 'موادك بلس',      price: 185000,  unit: 'قطعة',          image: IMG['water-meter'],   badge: 'جديد', rating: '4.6' },
];

const discountPrice = (price: number) => Math.round((price * 0.85) / 1000) * 1000;
const products: Product[] = baseProducts.map((product) => ({
  ...product,
  price: discountPrice(product.price),
  ...(product.oldPrice ? { oldPrice: discountPrice(product.oldPrice) } : {}),
}));

type StoreContextValue = {
  cart: Record<string, number>;
  favorites: string[];
  search: string;
  location: string;
  cartCount: number;
  setSearch: (value: string) => void;
  setLocation: (value: string) => void;
  addProduct: (product: Product) => void;
  changeQty: (id: string, delta: number) => void;
  toggleFavorite: (id: string) => void;
  clearCart: () => void;
};

const StoreContext = createContext<StoreContextValue | null>(null);

const STORAGE_KEYS = { cart: 'naem-cart', favorites: 'naem-favorites', location: 'naem-location', searchHistory: 'naem-search-history' } as const;

const MAX_SEARCH_HISTORY = 5;

function addToSearchHistory(term: string) {
  const trimmed = term.trim();
  if (!trimmed) return;
  const current: string[] = readStored(STORAGE_KEYS.searchHistory, []);
  const filtered = current.filter((s) => s !== trimmed);
  writeStored(STORAGE_KEYS.searchHistory, [trimmed, ...filtered].slice(0, MAX_SEARCH_HISTORY));
}

function clearSearchHistory() {
  writeStored(STORAGE_KEYS.searchHistory, []);
}

function readStored<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

function writeStored(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // التخزين غير متاح — نتجاهل الخطأ
  }
}

function StoreProvider({ children }: PropsWithChildren) {
  const [cart, setCartState] = useState<Record<string, number>>(() => readStored(STORAGE_KEYS.cart, {}));
  const [favorites, setFavoritesState] = useState<string[]>(() => readStored(STORAGE_KEYS.favorites, []));
  const [search, setSearch] = useState('');
  const [location, setLocationState] = useState(() => readStored(STORAGE_KEYS.location, 'دمشق، دمشق المدينة'));
  const setCart = (updater: (current: Record<string, number>) => Record<string, number>) => setCartState((current) => {
    const next = updater(current);
    writeStored(STORAGE_KEYS.cart, next);
    return next;
  });
  const setFavorites = (updater: (current: string[]) => string[]) => setFavoritesState((current) => {
    const next = updater(current);
    writeStored(STORAGE_KEYS.favorites, next);
    return next;
  });
  const setLocation = (value: string) => {
    writeStored(STORAGE_KEYS.location, value);
    setLocationState(value);
  };
  const cartCount = Object.values(cart).reduce((total, quantity) => total + quantity, 0);
  const addProduct = (product: Product) => setCart((current) => ({ ...current, [product.id]: (current[product.id] || 0) + 1 }));
  const changeQty = (id: string, delta: number) => setCart((current) => {
    const next = (current[id] || 0) + delta;
    const copy = { ...current };
    if (next <= 0) delete copy[id];
    else copy[id] = next;
    return copy;
  });
  const toggleFavorite = (id: string) => setFavorites((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  return <StoreContext.Provider value={{ cart, favorites, search, location, cartCount, setSearch, setLocation, addProduct, changeQty, toggleFavorite, clearCart: () => setCart(() => ({})) }}>{children}</StoreContext.Provider>;
}

function useStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used inside StoreProvider');
  return context;
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('ar-SY', { maximumFractionDigits: 0 }).format(price);
}

function RatingStars({ rating, compact = false }: { rating: string; compact?: boolean }) {
  const numericRating = Number.parseFloat(rating) || 0;
  const filledStars = Math.max(0, Math.min(5, Math.round(numericRating)));
  return (
    <span className={`inline-flex items-center ${compact ? 'gap-0.5' : 'gap-1'}`} aria-label={`تقييم ${rating} من 5 نجوم`}>
      <span className="inline-flex items-center" aria-hidden="true">
        {Array.from({ length: 5 }, (_, index) => (
          <Star
            key={index}
            size={compact ? 12 : 15}
            strokeWidth={1.7}
            fill={index < filledStars ? 'currentColor' : 'none'}
            className={index < filledStars ? 'text-[#bc8e46]' : 'text-[#d7d9d6]'}
          />
        ))}
      </span>
      <span className={`${compact ? 'text-[10px]' : 'text-xs'} font-bold text-[#5d6969]`}>{rating}</span>
    </span>
  );
}

function Logo() {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
  return (
    <div className="flex items-center gap-3" data-testid="brand-logo">
      <img src={`${basePath}/images/mawadak-logo.png`} alt="موادك لمواد البناء" className="h-12 w-auto object-contain" />
    </div>
  );
}

function AccountButton({ onAccount }: { onAccount?: () => void }) {
  const { user, isLoaded } = useUser();
  const [, setLocation] = useLocation();
  if (isLoaded && user) {
    return <button onClick={() => setLocation('/account')} className="hidden h-9 items-center gap-1.5 rounded-md px-2 text-xs font-bold text-[#bc8e46] transition hover:bg-[#f3f4f6] sm:flex" data-testid="button-account">
      <UserRound size={16} strokeWidth={1.8} /><span className="max-w-[110px] truncate">{user.firstName || user.fullName || user.primaryEmailAddress?.emailAddress || 'حسابي'}</span>
    </button>;
  }
  return <button onClick={onAccount} className="hidden h-9 items-center gap-1.5 rounded-md px-2 text-xs font-bold transition hover:bg-[#f3f4f6] sm:flex" data-testid="button-account"><UserRound size={16} strokeWidth={1.8} /> تسجيل الدخول</button>;
}

function SearchBox({ search, onSearch, onNavigate, testIdSuffix = '' }: { search: string; onSearch: (v: string) => void; onNavigate: () => void; testIdSuffix?: string }) {
  const [focused, setFocused] = useState(false);
  const [history, setHistory] = useState<string[]>(() => readStored(STORAGE_KEYS.searchHistory, []));
  const containerRef = useRef<HTMLDivElement>(null);

  const suggestions = search.trim().length >= 1
    ? products.filter((p) => `${p.name} ${p.categoryLabel} ${p.subcategory || ''} ${p.brand || ''}`.includes(search.trim())).slice(0, 5)
    : [];

  const showSuggestions = focused && suggestions.length > 0;
  const showHistory = focused && !search.trim() && history.length > 0;
  const showDrop = showSuggestions || showHistory;

  const commitSearch = () => {
    const trimmed = search.trim();
    if (trimmed) {
      addToSearchHistory(trimmed);
      setHistory(readStored(STORAGE_KEYS.searchHistory, []));
    }
    setFocused(false);
    onNavigate();
  };

  const pickHistory = (term: string) => {
    onSearch(term);
    addToSearchHistory(term);
    setHistory(readStored(STORAGE_KEYS.searchHistory, []));
    setFocused(false);
    onNavigate();
  };

  const handleClearHistory = (e: React.MouseEvent) => {
    e.preventDefault();
    clearSearchHistory();
    setHistory([]);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setFocused(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={containerRef} className={`relative flex w-full ${testIdSuffix ? '' : 'max-w-[440px]'}`}>
      <input
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        onFocus={() => setFocused(true)}
        onKeyDown={(e) => { if (e.key === 'Enter') { commitSearch(); } }}
        placeholder="ابحث عن مواد البناء"
        aria-label="البحث عن المنتجات"
        aria-autocomplete="list"
        data-testid={`input-search${testIdSuffix}`}
        className="h-10 w-full rounded-r-md border border-l-0 border-[#e0e0e0] bg-white pr-3 pl-8 text-[13px] outline-none transition placeholder:text-[#b0b0b0] focus:border-[#bc8e46]"
      />
      {search && (
        <button onClick={() => { onSearch(''); setFocused(false); }} className="absolute left-[86px] top-1/2 -translate-y-1/2 text-[#999]" aria-label="مسح البحث" data-testid={`button-clear-search${testIdSuffix}`}>
          <X size={15} />
        </button>
      )}
      <button
        onClick={() => { commitSearch(); }}
        className="h-10 rounded-l-md bg-[#1b3689] px-6 text-[13px] font-bold text-white transition hover:bg-[#06113b]"
        data-testid={`button-search${testIdSuffix}`}
      >
        بحث
      </button>

      {showDrop && (
        <div className="absolute top-full right-0 z-[80] mt-1 w-full rounded-xl border border-[#e5e7eb] bg-white shadow-xl" role="listbox" data-testid="search-suggestions">
          {/* سجل البحث السابق */}
          {showHistory && (
            <>
              <div className="flex items-center justify-between border-b border-[#f3f4f6] px-4 py-2">
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-[#9ca3af]"><Clock3 size={12} /> عمليات البحث الأخيرة</span>
                <button onMouseDown={handleClearHistory} className="text-[11px] font-bold text-[#bc8e46] hover:text-[#9a7034]" data-testid="button-clear-history">مسح السجل</button>
              </div>
              {history.map((term) => (
                <button
                  key={term}
                  onMouseDown={(e) => { e.preventDefault(); pickHistory(term); }}
                  className="flex w-full items-center gap-3 border-b border-[#f3f4f6] px-4 py-2.5 text-right text-[13px] last:border-b-0 hover:bg-[#faf6ec]"
                  role="option"
                  data-testid={`history-item-${term}`}
                >
                  <Clock3 size={14} className="shrink-0 text-[#c2c2c2]" />
                  <span className="min-w-0 flex-1 truncate font-semibold text-[#262626]">{term}</span>
                  <Search size={12} className="shrink-0 text-[#bc8e46]" />
                </button>
              ))}
            </>
          )}

          {/* اقتراحات المنتجات */}
          {showSuggestions && suggestions.map((p) => (
            <button
              key={p.id}
              onMouseDown={(e) => { e.preventDefault(); onSearch(p.name); addToSearchHistory(p.name); setHistory(readStored(STORAGE_KEYS.searchHistory, [])); setFocused(false); onNavigate(); }}
              className="flex w-full items-center gap-3 border-b border-[#f3f4f6] px-4 py-2.5 text-right text-[13px] last:border-b-0 hover:bg-[#faf6ec]"
              role="option"
              data-testid={`suggestion-${p.id}`}
            >
              <img src={p.image} alt="" className="h-9 w-9 shrink-0 rounded-md object-contain" />
              <div className="min-w-0 flex-1">
                <div className="truncate font-bold text-[#262626]">{p.name}</div>
                <div className="mt-0.5 text-[10px] font-semibold text-[#bc8e46]">{p.categoryLabel}</div>
              </div>
              <span className="shrink-0 text-[11px] font-bold text-[#5d6969]">{new Intl.NumberFormat('ar-SY', { maximumFractionDigits: 0 }).format(p.price)} ل.س</span>
            </button>
          ))}

          {showSuggestions && (
            <button
              onMouseDown={(e) => { e.preventDefault(); commitSearch(); }}
              className="flex w-full items-center justify-center gap-2 px-4 py-2.5 text-[12px] font-bold text-[#bc8e46] hover:bg-[#faf6ec]"
              data-testid="suggestions-view-all"
            >
              <Search size={13} /> عرض كل النتائج
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Header({ onCart, cartCount, onSearch, search, location, onLocation, onAccount }: { onCart: () => void; cartCount: number; onSearch: (v: string) => void; search: string; location: string; onLocation?: () => void; onAccount?: () => void }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [, setLocation] = useLocation();
  const navigate = (path: string) => {
    setLocation(path);
    setMobileOpen(false);
  };
  const [catsOpen, setCatsOpen] = useState(false);
  const go = (path: string) => { navigate(path); setCatsOpen(false); };
  const goSearch = () => { if (search) navigate('/catalog'); };
  return (
    <>
      <header className="site-header">
        {/* الصف الأول: شعار + بحث + أزرار + حساب */}
        <div className="container-wide flex min-h-[58px] items-center gap-3 py-1.5">
          <button className="touch-target rounded-md p-1.5 text-[#262626] hover:bg-[#f3f4f6] md:hidden" onClick={() => setMobileOpen(!mobileOpen)} aria-label="فتح القائمة" data-testid="button-mobile-menu"><Menu size={22} /></button>
          <Link href="/" aria-label="الصفحة الرئيسية"><Logo /></Link>
          <button className="mr-auto flex items-center gap-1.5 rounded-lg border border-[#e0e0e0] bg-white px-2.5 py-1.5 text-[#1b3689] transition hover:border-[#bc8e46] hover:bg-[#fdf8ee] md:hidden" onClick={onCart} aria-label="فتح السلة" data-testid="button-cart-center-mobile">
            <ShoppingBag size={19} strokeWidth={1.8} />
            <span className="text-[13px] font-extrabold text-[#262626]">السلة</span>
            {cartCount > 0 && <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#bc8e46] px-1 text-[11px] font-bold text-white" data-testid="text-cart-count">{cartCount}</span>}
          </button>
          <div className="hidden flex-1 items-center md:flex">
            <SearchBox search={search} onSearch={onSearch} onNavigate={goSearch} />
          </div>
          <div className="hidden items-center gap-2 lg:flex">
            <button onClick={() => go('/catalog')} className="h-9 rounded-md border border-[#e0e0e0] bg-white px-4 text-xs font-bold text-[#444] transition hover:border-[#bc8e46] hover:text-[#bc8e46]" data-testid="button-suppliers">الموردين</button>
            <button onClick={() => go('/categories')} className="h-9 rounded-md border border-[#e0e0e0] bg-white px-4 text-xs font-bold text-[#444] transition hover:border-[#bc8e46] hover:text-[#bc8e46]" data-testid="button-about">من نحن</button>
          </div>
          <div className="mr-auto flex items-center gap-1 sm:gap-2 text-[#444]">
            <button onClick={onLocation} className="hidden h-9 items-center gap-1 rounded-md px-2 text-xs font-bold transition hover:bg-[#f3f4f6] sm:flex" data-testid="button-location"><MapPin size={14} className="text-[#bc8e46]" /><span className="max-w-[110px] truncate">{location.split('،')[0]}</span><ChevronDown size={13} /></button>
            <span className="hidden h-4 w-px bg-[#e0e0e0] sm:block" />
            <button className="hidden h-9 items-center gap-1 rounded-md px-2 text-xs font-bold transition hover:bg-[#f3f4f6] lg:flex" data-testid="button-language">AR <ChevronDown size={13} /></button>
            <button className="hidden h-9 items-center gap-1 rounded-md px-2 text-xs font-bold transition hover:bg-[#f3f4f6] lg:flex" data-testid="button-currency">ل.س <ChevronDown size={13} /></button>
            <span className="hidden h-4 w-px bg-[#e0e0e0] lg:block" />
            <AccountButton onAccount={onAccount} />
            <button className="touch-target relative flex items-center gap-1.5 rounded-lg border border-[#e0e0e0] bg-white px-2.5 py-1.5 transition hover:border-[#bc8e46] hover:bg-[#fdf8ee]" onClick={onCart} aria-label="فتح السلة" data-testid="button-cart">
              <ShoppingBag size={20} strokeWidth={1.8} className="text-[#1b3689]" />
              <span className="hidden text-[13px] font-extrabold text-[#262626] sm:inline">السلة</span>
              {cartCount > 0 && <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#bc8e46] px-1 text-[11px] font-bold text-white" data-testid="text-cart-count">{cartCount}</span>}
            </button>
          </div>
        </div>
        <div className="container-wide pb-2 md:hidden">
          <SearchBox search={search} onSearch={onSearch} onNavigate={goSearch} testIdSuffix="-mobile" />
        </div>
        {/* الصف الثاني: شريط الفئات */}
        <nav className={`${mobileOpen ? 'block' : 'hidden'} border-t border-[#ececec] bg-white md:block`} aria-label="التنقل الرئيسي">
          <div className="container-wide flex flex-col gap-1 py-2 md:min-h-[46px] md:flex-row md:items-center md:gap-0 md:py-0">
            <button onClick={() => setCatsOpen(true)} className="flex h-9 items-center gap-2 rounded-md bg-[#1b3689] px-4 text-xs font-extrabold text-white transition hover:bg-[#06113b] md:ml-4" data-testid="button-all-categories"><LayoutGrid size={14} /> كل الفئات</button>
            {([['مواد خام', 'raw', Boxes], ['الصحية', 'health', Droplets], ['الكهرباء والإنارة', 'electric', Zap], ['التشطيبات والديكور', 'paint', Paintbrush], ['معدات وأدوات البناء', 'tools', Hammer]] as [string, string, LucideIcon][]).map(([item, id, Icon], i) => <button key={item} onClick={() => go(`/category/${id}`)} className={`flex items-center gap-1.5 py-2 text-right text-[13px] font-semibold text-[#333] transition hover:text-[#bc8e46] md:border-r md:border-[#ececec] md:px-3.5 md:py-0 ${i === 0 ? 'md:border-r-0' : ''}`} data-testid={`nav-${item}`}><Icon size={14} className="text-[#bc8e46]" strokeWidth={1.9} />{item}</button>)}
            <button onClick={() => go('/offers')} className="flex items-center gap-1.5 py-2 text-right text-[13px] font-bold text-[#1b3689] md:mr-auto md:py-0" data-testid="button-offers"><Zap size={14} /> عروض الأسبوع</button>
          </div>
        </nav>
      </header>
      {/* قائمة كل الفئات الجانبية */}
      {catsOpen && <>
        <div className="fixed inset-0 z-[55] bg-black/40" onClick={() => setCatsOpen(false)} data-testid="categories-overlay" />
        <aside role="dialog" aria-modal="true" onKeyDown={(e) => { if (e.key === 'Escape') setCatsOpen(false); }} className="fixed bottom-0 right-0 top-0 z-[60] w-full max-w-[320px] overflow-y-auto bg-white shadow-2xl" aria-label="كل الفئات" data-testid="categories-drawer">
          <div className="flex items-center justify-between border-b border-[#ececec] px-4 py-3">
            <button onClick={() => setCatsOpen(false)} className="rounded-md p-1.5 text-[#666] hover:bg-[#f3f4f6]" aria-label="إغلاق القائمة" data-testid="button-close-categories"><X size={20} /></button>
            <span className="rounded bg-[#bc8e46] px-3 py-1 text-xs font-extrabold text-white">كل الفئات</span>
          </div>
          <div>
            {drawerCategories.map((cat) => {
              const Icon = cat.icon;
              return cat.id
                ? <button key={cat.name} onClick={() => go(`/category/${cat.id}`)} className="flex w-full items-center gap-2.5 border-b border-[#f2f2f2] px-4 py-3 text-right text-[13px] font-bold text-[#262626] transition hover:bg-[#faf6ec] hover:text-[#bc8e46]" data-testid={`drawer-category-${cat.id}`}>
                    <Icon size={16} className="shrink-0 text-[#bc8e46]" strokeWidth={1.9} />{cat.name}
                  </button>
                : <div key={cat.name} className="flex w-full items-center gap-2.5 border-b border-[#f2f2f2] px-4 py-3 text-right text-[13px] font-semibold text-[#c2c2c2]" data-testid={`drawer-category-soon-${cat.name}`}>
                    <Icon size={16} className="shrink-0 text-[#d4d4d4]" strokeWidth={1.9} />{cat.name}<span className="mr-auto text-[9px] font-bold text-[#d4b06a]">قريباً</span>
                  </div>;
            })}
          </div>
        </aside>
      </>}
    </>
  );
}

function Hero({ slide, onSlide, onCta }: { slide: number; onSlide: (n: number) => void; onCta?: () => void }) {
  const slides = [
    { eyebrow: 'موادك لمواد البناء', title: 'توريد مواد البناء للمشاريع والورش\nبخيارات معتمدة وخدمة محترفة . . .', desc: '', cta: 'تسوق مواد البناء', image: '/images/hero-crane.jpg', light: true },
    { eyebrow: 'موادك لمواد البناء', title: 'خليك بموقعك\nبضاعتك واصلة\nعندك', desc: '', cta: 'تسوق مواد البناء', image: '/images/hero-warehouse.jpg' },
    { eyebrow: 'مخصص للمحترفين', title: 'أسعار مشاريع،\nوخدمة تعرف احتياجك', desc: '', cta: 'ابدأ طلبك', image: '/images/product-drill.jpg' },
  ];
  const current = slides[slide];
  useEffect(() => {
    const timer = setInterval(() => onSlide((slide + 1) % slides.length), 6000);
    return () => clearInterval(timer);
  }, [slide]);
  return (
    <section className="relative">
      <div className="relative h-[clamp(180px,20vw,390px)] overflow-hidden bg-[#f2f2f2]">
        {slides.map((s, i) => <img key={s.image} src={s.image} alt="" aria-hidden={slide !== i} loading={i === 0 ? 'eager' : 'lazy'} decoding="async" fetchPriority={i === 0 ? 'high' : 'low'} className={`hero-image absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${slide === i ? 'opacity-100' : 'opacity-0'}`} />)}
        <div className={`absolute inset-0 transition-opacity duration-700 ${current.light ? 'bg-[linear-gradient(270deg,rgba(255,255,255,.88)_0%,rgba(255,255,255,.55)_38%,rgba(255,255,255,.05)_72%)]' : 'bg-[linear-gradient(90deg,rgba(0,0,0,.82)_0%,rgba(0,0,0,.55)_35%,rgba(0,0,0,.18)_70%,rgba(0,0,0,.08)_100%)]'}`} />
        <div className="container-wide relative z-10 h-full py-3">
          {current.light
            ? <div className="absolute right-[6%] top-1/2 w-[min(46%,560px)] -translate-y-1/2 text-right sm:right-[8%]">
                <span className="mb-2 block text-sm font-black text-[#bc8e46] sm:text-lg lg:text-2xl">{current.eyebrow}</span>
                <h1 className="whitespace-pre-line text-[16px] font-extrabold leading-[1.7] tracking-[.02em] text-[#4a4a4a] sm:text-[21px] lg:text-[26px]" data-testid="hero-title">{current.title}</h1>
              </div>
            : <div className="absolute left-[11%] top-1/2 w-[min(38%,420px)] -translate-y-1/2 text-left sm:left-[16%] lg:left-[19%]">
                <span className="mb-2 block text-xs font-extrabold text-[#f3bd4c] sm:text-sm">{current.eyebrow}</span>
                <h1 className="whitespace-pre-line text-[21px] font-extrabold leading-[1.38] tracking-[.01em] text-white drop-shadow-[0_2px_4px_rgba(0,0,0,.45)] sm:text-[25px] lg:text-[30px]" data-testid="hero-title">{current.title}</h1>
              </div>}
        </div>
        <div className="absolute bottom-3 right-1/2 z-10 flex translate-x-1/2 items-center gap-2">
          {slides.map((_, i) => <button key={i} onClick={() => onSlide(i)} aria-label={`الشريحة ${i + 1}`} data-testid={`button-hero-dot-${i}`} className={`h-1.5 rounded-full transition-all ${slide === i ? 'w-8 bg-[#bc8e46]' : 'w-4 bg-white/50'}`} />)}
        </div>
        <button onClick={() => onSlide((slide + 2) % 3)} className={`absolute right-4 top-1/2 z-10 -translate-y-1/2 p-1.5 transition hover:text-[#bc8e46] sm:right-6 ${current.light ? 'text-[#6b6b6b]' : 'text-white'}`} aria-label="السابق" data-testid="button-hero-prev"><ChevronRight size={26} /></button>
        <button onClick={() => onSlide((slide + 1) % 3)} className={`absolute left-4 top-1/2 z-10 -translate-y-1/2 p-1.5 transition hover:text-[#bc8e46] sm:left-6 ${current.light ? 'text-[#6b6b6b]' : 'text-white'}`} aria-label="التالي" data-testid="button-hero-next"><ChevronLeft size={26} /></button>
      </div>
    </section>
  );
}

function CategorySection({ active, onCategory }: { active: string; onCategory: (c: string) => void }) {
  return (
    <section className="container-wide mt-8" id="categories">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xl font-extrabold text-[#262626] sm:text-2xl"><Sparkles size={20} className="text-[#bc8e46]" />الفئات الأكثر شيوعاً</h2>
        <div className="flex items-center gap-3">
          <button onClick={() => onCategory('all')} className="text-xs font-bold text-[#262626] underline underline-offset-4 transition hover:text-[#bc8e46]" data-testid="button-view-all-categories">مشاهدة كل الفئات</button>
          <span className="hidden items-center gap-1.5 sm:flex">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-[#bc8e46] text-white"><ChevronRight size={15} /></span>
            <span className="grid h-7 w-7 place-items-center rounded-md bg-[#bc8e46] text-white"><ChevronLeft size={15} /></span>
          </span>
        </div>
      </div>
      <div className="hide-scrollbar grid grid-flow-col auto-cols-[230px] gap-3 overflow-x-auto pb-2 sm:auto-cols-[minmax(0,1fr)] sm:grid-cols-5 sm:grid-flow-row">
        {categories.slice(0, 5).map((cat) => <button key={cat.id} onClick={() => onCategory(active === cat.id ? 'all' : cat.id)} className={`group flex h-[64px] items-stretch overflow-hidden rounded-sm border border-[#ececec] bg-white text-right shadow-[0_1px_4px_rgba(38,38,38,.05)] transition hover:shadow-[0_6px_14px_rgba(38,38,38,.12)] ${active === cat.id ? 'ring-2 ring-[#bc8e46]' : ''}`} data-testid={`card-category-${cat.id}`}>
          <div className="flex flex-1 items-center justify-between gap-1 px-3">
            <ArrowLeft size={15} className="shrink-0 text-[#8a8a8a] transition group-hover:-translate-x-0.5 group-hover:text-[#bc8e46]" />
            <h3 className="text-[13px] font-extrabold leading-tight text-[#262626]">{cat.name}</h3>
          </div>
          <img src={cat.image} alt={cat.name} loading="lazy" decoding="async" className="image-crisp h-full w-[46%] object-cover" />
        </button>)}
      </div>
    </section>
  );
}

function ProductCard({ product, favorite, onFavorite, onAdd, selected = false, quantity = 0, onChangeQty }: { product: Product; favorite: boolean; onFavorite: () => void; onAdd: () => void; selected?: boolean; quantity?: number; onChangeQty?: (delta: number) => void }) {
  return (
    <article className={`group relative flex flex-col overflow-hidden border-2 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(38,38,38,.08)] sm:min-w-0 ${selected ? 'border-[#bc8e46] bg-[#fff9f0] shadow-[0_4px_16px_rgba(188,142,70,.25)] ring-2 ring-[#bc8e46]/20' : 'border-[#e7e7e7] bg-white hover:border-[#d7d7d7]'}`} data-testid={`card-product-${product.id}`}>
      {/* صورة المنتج بأسلوب البطاقات المرجعية */}
      <div className="relative h-[190px] overflow-hidden bg-white sm:h-[220px]">
        <Link href={`/product/${product.id}`} className="absolute inset-0 block" data-testid={`link-product-image-${product.id}`}>
          <img src={product.image} alt={product.name} loading="lazy" decoding="async" className="image-crisp h-full w-full object-contain p-4 transition duration-500 group-hover:scale-[1.03]" />
        </Link>
        {product.badge && (
          <span className={`absolute right-2 top-2 z-10 rounded px-2 py-0.5 text-[10px] font-bold leading-5 ${product.badge.includes('عرض') ? 'bg-[#bc8e46] text-white' : 'bg-[#f3bd4c] text-[#262626]'}`}>
            {product.badge}
          </span>
        )}
        {selected && (
          <span className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-[#25692a] text-white shadow-md">
            <Check size={14} strokeWidth={3} />
          </span>
        )}
        <button
          onClick={onAdd}
          className={`touch-target absolute inset-x-0 bottom-2 z-10 mx-auto flex h-8 w-[82%] items-center justify-center gap-1 rounded-full text-[11px] font-bold text-white shadow-md transition hover:opacity-90 ${selected ? 'bg-[#25692a]' : 'bg-[#1b3689]'}`}
          aria-label={`إضافة ${product.name} إلى السلة`}
          data-testid={`button-add-${product.id}`}
        >
          {selected ? <><Check size={13} strokeWidth={3} />في السلة ({quantity})</> : <><Plus size={13} />أضف إلى السلة</>}
        </button>
        <button
          onClick={onFavorite}
          className={`touch-target absolute left-2 top-2 flex h-8 w-8 items-center justify-center rounded-full border bg-white shadow-sm transition-all hover:scale-110 ${favorite ? 'border-[#bc8e46] text-[#bc8e46]' : 'border-gray-200 text-gray-400 hover:border-[#bc8e46] hover:text-[#bc8e46]'}`}
          aria-label={favorite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
          data-testid={`button-favorite-${product.id}`}
        >
          <Heart size={14} fill={favorite ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* بيانات المنتج */}
      <div className="flex flex-1 flex-col border-t border-[#eeeeee] px-3 pb-3 pt-2.5 text-center">
        {/* الماركة + التصنيف */}
        <div className="mb-1.5 flex items-center justify-center gap-1">
          <span className="truncate text-[10px] font-semibold text-[#5e5e5e]">{product.categoryLabel}</span>
          {product.brand && (
            <span className="shrink-0 text-[9px] font-bold text-[#262626]">{product.brand}</span>
          )}
        </div>

        {/* اسم المنتج */}
        <Link href={`/product/${product.id}`} className="block flex-1">
          <h3 className="line-clamp-2 min-h-[40px] text-[13px] font-bold leading-[1.45] text-[#262626]" data-testid={`text-product-name-${product.id}`}>
            {product.name}
          </h3>
        </Link>

        {/* مواصفات المنتج */}
        {product.specs && (
          <p className="mt-1 truncate rounded-md bg-[#f3bd4c] px-2 py-1 text-[10px] font-bold text-[#4a2e00]" data-testid={`text-specs-${product.id}`}>
            {product.specs}
          </p>
        )}

        {/* التقييم + الوحدة */}
        <div className="mt-1.5 flex items-center justify-center text-gray-400">
          <RatingStars rating={product.rating} compact />
          <span className="text-gray-300">•</span>
          <span className="mr-1 truncate text-[10px]">{product.unit}</span>
        </div>

        {/* السعر + زر الإضافة */}
        <div className="mt-2 flex items-baseline justify-center gap-2 border-t border-[#f0f0f0] pt-2">
          <div className="flex items-baseline gap-0.5">
            <span className="text-[16px] font-bold leading-none text-[#262626]" data-testid={`text-price-${product.id}`}>{formatPrice(product.price)}</span>
            <span className="text-[10px] font-semibold text-gray-400"> ل.س</span>
          </div>
          {product.priceUSD && (
            <div className="text-[11px] font-bold text-[#bc8e46]">${product.priceUSD}</div>
          )}
          {product.oldPrice && (
            <div className="text-[10px] text-gray-400 line-through">{formatPrice(product.oldPrice)} ل.س</div>
          )}
        </div>
      </div>
    </article>
  );
}

function ProductSection({ active, search, onAdd, favorites, onFavorite, cart, onChangeQty }: { active: string; search: string; onAdd: (p: Product) => void; favorites: string[]; onFavorite: (id: string) => void; cart: Record<string, number>; onChangeQty?: (id: string, delta: number) => void }) {
  const visible = products.filter(p => (!search || `${p.name} ${p.categoryLabel}`.includes(search)) && (active === 'all' || p.category === active));
  return (
    <section className="container-wide mt-16" id="products">
      <div className="mb-6 flex items-center justify-between"><h2 className="flex items-center gap-2 text-xl font-extrabold text-[#262626] sm:text-2xl"><Sparkles size={20} className="text-[#bc8e46]" />المنتجات الأكثر مبيعاً</h2><div className="hidden items-center gap-1 text-xs font-semibold text-[#77807c] sm:flex"><span className="h-2 w-2 rounded-full bg-[#5f9a7f]" /> متوفر للشحن اليوم</div></div>
       {visible.length ? <div className="hide-scrollbar grid grid-flow-col auto-cols-[minmax(210px,1fr)] gap-3 overflow-x-auto pb-4 sm:grid-flow-row sm:auto-cols-auto sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">{visible.map((p, i) => <div key={p.id} className={`fade-up delay-${Math.min(i + 1, 3)}`}><ProductCard product={p} favorite={favorites.includes(p.id)} onFavorite={() => onFavorite(p.id)} onAdd={() => onAdd(p)} selected={!!cart[p.id]} quantity={cart[p.id] || 0} onChangeQty={(delta) => onChangeQty?.(p.id, delta)} /></div>)}</div> : <div className="rounded-2xl border border-dashed border-[#d1d5db] bg-[#f9fafb] py-16 text-center"><Search className="mx-auto text-[#bc8e46]" size={32} /><h3 className="mt-3 font-extrabold text-[#262626]">لا توجد منتجات بهذا الاسم</h3><p className="mt-1 text-sm text-[#77807c]">جرّب كلمة بحث أخرى أو اختر تصنيفاً مختلفاً</p></div>}
    </section>
  );
}

function ValueStrip() {
  const values = [{ icon: Truck, title: 'توصيل حتى موقعك', text: 'نرتبها، نحملها، ونوصلها' }, { icon: BadgeCheck, title: 'منتجات أصلية', text: 'موردون موثوقون دائماً' }, { icon: ShieldCheck, title: 'دفع آمن ومرن', text: 'خيارات دفع تناسبك' }, { icon: Clock3, title: 'دعم يعرف البناء', text: 'نحن معك قبل وبعد الطلب' }];
  return <section className="container-wide mt-16"><div className="grid divide-y divide-[#d1d5db] rounded-2xl border border-[#d1d5db] bg-[#e8eee8] px-5 py-2 sm:grid-cols-4 sm:divide-x sm:divide-y-0 sm:divide-x-reverse sm:px-4">{values.map(({ icon: Icon, title, text }) => <div key={title} className="flex items-center gap-3 py-4 sm:justify-center sm:py-5"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#ffffff] text-[#bc8e46]"><Icon size={20} /></div><div><h3 className="text-xs font-extrabold text-[#262626]">{title}</h3><p className="mt-1 text-[10px] font-medium text-[#6e7b78]">{text}</p></div></div>)}</div></section>;
}

function Newsletter() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  return <section className="container-wide mt-20"><div className="relative overflow-hidden rounded-[22px] bg-[#f3bd4c] px-6 py-9 sm:px-14 sm:py-12"><div className="absolute -left-10 -top-16 h-48 w-48 rounded-full border-[26px] border-[#bc8e46]/20" /><div className="relative flex flex-col justify-between gap-7 sm:flex-row sm:items-center"><div><span className="text-xs font-extrabold tracking-[.15em] text-[#7a401d]">نشرة موادك</span><h2 className="mt-2 text-2xl font-extrabold tracking-tight text-[#262626] sm:text-3xl">خلّك على اطلاع بعروض الموقع</h2><p className="mt-2 text-sm font-semibold text-[#4d5e59]">أسعار أفضل، منتجات جديدة، ونصائح تنفعك في كل مرحلة.</p></div>{sent ? <div className="rounded-xl bg-[#262626] px-5 py-4 text-sm font-bold text-white" data-testid="status-newsletter-success">تم الاشتراك بنجاح، أهلاً بك في موادك</div> : <form className="flex w-full max-w-[420px] gap-2" onSubmit={(e) => { e.preventDefault(); if (email) setSent(true); }}><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="بريدك الإلكتروني" required aria-label="البريد الإلكتروني" data-testid="input-newsletter-email" className="min-w-0 flex-1 rounded-xl border-0 bg-[#ffffff] px-4 text-sm outline-none placeholder:text-[#969a92]" /><button type="submit" className="rounded-xl bg-[#262626] px-4 py-3 text-xs font-extrabold text-white transition hover:bg-[#9a7034]" data-testid="button-newsletter-submit">اشترك الآن</button></form>}</div></div></section>;
}

function getLocationSelection(value: string) {
  const region = syrianRegions.find((item) => value.includes(item.name)) || syrianRegions[0];
  const area = region.areas.find((item) => value.includes(item)) || region.areas[0];
  return { region, area };
}

function SyrianMapPicker({ selectedRegionId, selectedArea, onRegionChange, onAreaChange }: { selectedRegionId: string; selectedArea: string; onRegionChange: (region: SyrianRegion) => void; onAreaChange: (area: string) => void }) {
  const selectedRegion = syrianRegions.find((item) => item.id === selectedRegionId) || syrianRegions[0];
  const [hoveredRegionId, setHoveredRegionId] = useState<string | null>(null);
  const normalizeMapRegionId = (pathId: string) => pathId === 'hasaka' ? 'hasakah' : pathId === 'deir-zor' ? 'deir-ez-zor' : pathId;
  const chooseMapRegion = (pathId: string) => {
    const regionId = normalizeMapRegionId(pathId);
    const region = syrianRegions.find((item) => item.id === regionId);
    if (region) onRegionChange(region);
  };

  return <div className="grid gap-5 md:grid-cols-[minmax(0,1.55fr)_minmax(235px,.75fr)] md:items-start">
    <section className="min-w-0">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1">
        <div>
          <h3 className="text-sm font-black text-[#1b3689]">خريطة المحافظات السورية</h3>
          <p className="mt-0.5 text-[10px] font-semibold text-[#77807c]">حدود دقيقة لجميع المحافظات الـ14</p>
        </div>
        <div className="flex items-center gap-3 rounded-full border border-[#e4e8e5] bg-white px-3 py-1.5 text-[9px] font-bold text-[#536363] shadow-sm">
          <span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full bg-[#f3bd4c] ring-1 ring-[#bc8e46]" />المحدد</span>
          <span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full bg-[#dce9e2] ring-1 ring-[#6f9b81]" />متاح للتوصيل</span>
        </div>
      </div>
      <div className="relative mx-auto aspect-[20/21] w-full max-w-[660px] overflow-hidden rounded-[26px] border-2 border-[#1b3689]/15 bg-[linear-gradient(145deg,#f5faf7_0%,#e5efe9_100%)] shadow-[0_18px_45px_rgba(27,54,137,.12)]" data-testid="syria-map">
        <div className="pointer-events-none absolute inset-0 opacity-35" style={{ backgroundImage: 'radial-gradient(circle at center, #9fb6a8 1px, transparent 1.2px)', backgroundSize: '22px 22px' }} />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/45 to-transparent" />
        <svg viewBox="0 0 1000 1050" className="absolute inset-0 h-full w-full" aria-label="خريطة تفاعلية لمحافظات سورية" role="img" preserveAspectRatio="xMidYMid meet">
          {Object.entries(SYRIA_GOVERNORATE_PATHS).map(([pathId, path]) => {
            const regionId = normalizeMapRegionId(pathId);
            const region = syrianRegions.find((item) => item.id === regionId);
            const isSelected = selectedRegion.id === regionId;
            const isHovered = hoveredRegionId === regionId;
            return <path
              key={pathId}
              d={path}
              fill={isSelected ? '#f3bd4c' : isHovered ? '#f8e5ab' : '#dce9e2'}
              stroke={isSelected ? '#1b3689' : isHovered ? '#bc8e46' : '#6f9b81'}
              strokeWidth={isSelected ? 5 : isHovered ? 3.5 : 2.5}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              role="button"
              tabIndex={0}
              aria-label={region ? `اختيار محافظة ${region.name}` : undefined}
              className="cursor-pointer outline-none transition-[fill,stroke,filter] duration-150 focus-visible:stroke-[#1b3689]"
              style={{ filter: isSelected ? 'drop-shadow(0 7px 8px rgba(188,142,70,.28))' : undefined }}
              onMouseEnter={() => setHoveredRegionId(regionId)}
              onMouseLeave={() => setHoveredRegionId(null)}
              onFocus={() => setHoveredRegionId(regionId)}
              onBlur={() => setHoveredRegionId(null)}
              onClick={() => chooseMapRegion(pathId)}
              onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); chooseMapRegion(pathId); } }}
            />;
          })}
        </svg>
        {syrianRegions.map((region) => {
          const isSelected = selectedRegion.id === region.id;
          return <button
            key={region.id}
            type="button"
            onClick={() => onRegionChange(region)}
            onMouseEnter={() => setHoveredRegionId(region.id)}
            onMouseLeave={() => setHoveredRegionId(null)}
            className={`absolute z-10 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 whitespace-nowrap rounded-full border px-2 py-1 text-[9px] font-black leading-none shadow-md backdrop-blur-sm transition duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1b3689] sm:text-[10px] ${isSelected ? 'z-20 scale-110 border-[#1b3689] bg-[#1b3689] text-white shadow-[0_5px_14px_rgba(27,54,137,.32)]' : 'border-white/90 bg-white/90 text-[#243c30] hover:z-20 hover:scale-105 hover:border-[#bc8e46] hover:text-[#1b3689]'}`}
            style={{ left: `${region.x}%`, top: `${region.y}%` }}
            aria-label={`اختيار محافظة ${region.name}`}
            aria-pressed={isSelected}
            data-testid={`map-region-${region.id}`}
          ><span className={`h-1.5 w-1.5 shrink-0 rounded-full ${isSelected ? 'bg-[#f3bd4c]' : 'bg-[#6f9b81]'}`} />{region.name}</button>;
        })}
        <div className="pointer-events-none absolute bottom-3 left-3 rounded-full border border-white/80 bg-white/80 px-2.5 py-1 text-[9px] font-extrabold text-[#1b3689] shadow-sm backdrop-blur-sm">الجمهورية العربية السورية</div>
      </div>
      <p className="mt-3 flex items-center gap-1.5 rounded-xl bg-[#f6f8f7] px-3 py-2 text-[10px] font-bold leading-5 text-[#68736e]"><MapPin size={13} className="shrink-0 text-[#bc8e46]" />اضغط مباشرة على حدود المحافظة أو اسمها، ثم اختر المدينة من اللوحة.</p>
    </section>

    <aside className="rounded-[22px] border border-[#dfe5e1] bg-white p-4 shadow-[0_12px_30px_rgba(38,38,38,.08)] sm:p-5 md:sticky md:top-3">
      <div className="mb-5 flex items-center justify-between gap-3 border-b border-[#edf0ee] pb-4">
        <div><p className="text-[10px] font-extrabold tracking-[.12em] text-[#bc8e46]">خطوتان فقط</p><h3 className="mt-1 text-base font-black text-[#262626]">حدد موقع التوصيل</h3></div>
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#1b3689] text-[#f3bd4c] shadow-[0_6px_16px_rgba(27,54,137,.22)]"><MapPin size={20} /></span>
      </div>
      <div className="space-y-4">
        <label className="block"><span className="mb-1.5 flex items-center gap-2 text-xs font-extrabold text-[#262626]"><b className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1b3689] text-[10px] text-white">1</b>المحافظة</span><select value={selectedRegion.id} onChange={(event) => { const region = syrianRegions.find((item) => item.id === event.target.value); if (region) onRegionChange(region); }} className="h-12 w-full rounded-xl border-2 border-[#e0e5e2] bg-[#fbfcfb] px-3 text-sm font-bold text-[#262626] outline-none transition focus:border-[#bc8e46] focus:bg-white focus:ring-4 focus:ring-[#f3bd4c]/15" data-testid="select-map-governorate">{syrianRegions.map((region) => <option key={region.id} value={region.id}>{region.name}</option>)}</select></label>
        <label className="block"><span className="mb-1.5 flex items-center gap-2 text-xs font-extrabold text-[#262626]"><b className="flex h-5 w-5 items-center justify-center rounded-full bg-[#bc8e46] text-[10px] text-white">2</b>المدينة أو المنطقة</span><select value={selectedArea} onChange={(event) => onAreaChange(event.target.value)} className="h-12 w-full rounded-xl border-2 border-[#e0e5e2] bg-[#fbfcfb] px-3 text-sm font-bold text-[#262626] outline-none transition focus:border-[#bc8e46] focus:bg-white focus:ring-4 focus:ring-[#f3bd4c]/15" data-testid="select-map-area">{selectedRegion.areas.map((area) => <option key={area} value={area}>{area}</option>)}</select></label>
      </div>
      <div className="mt-5 overflow-hidden rounded-2xl bg-[#1b3689] text-white shadow-[0_10px_25px_rgba(27,54,137,.22)]">
        <div className="border-b border-white/10 px-4 py-2 text-[9px] font-extrabold tracking-[.1em] text-[#f3bd4c]">الموقع المحدد</div>
        <div className="flex items-start gap-3 px-4 py-4"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[#f3bd4c]"><MapPin size={18} /></span><div><strong className="block text-sm font-black">{selectedRegion.name}</strong><span className="mt-1 block text-xs font-semibold text-white/75">{selectedArea}</span></div></div>
      </div>
      <div className="mt-4 flex items-start gap-2 rounded-xl border border-[#cfe4d5] bg-[#f0f8f2] px-3 py-3 text-[10px] font-bold leading-5 text-[#356047]"><Check size={15} className="mt-0.5 shrink-0 text-[#39815c]" />التوصيل متاح إلى جميع المحافظات السورية، ويؤكد فريقنا الموعد والتكلفة قبل الشحن.</div>
    </aside>
  </div>;
}

function CheckoutForm({ total, items, initialLocation, onClose, onSuccess }: { total: number; items: OrderItem[]; initialLocation: string; onClose: () => void; onSuccess: (reference: string, location: string) => void }) {
  const [name, setName] = useState(() => localStorage.getItem('mwd_name') || '');
  const [phone, setPhone] = useState(() => localStorage.getItem('mwd_phone') || '');
  const initialSelection = getLocationSelection(initialLocation);
  const [selectedRegionId, setSelectedRegionId] = useState(initialSelection.region.id);
  const [selectedArea, setSelectedArea] = useState(initialSelection.area);
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [submitError, setSubmitError] = useState('');
  const { isSignedIn } = useUser();
  const queryClient = useQueryClient();
  const createOrder = useCreateOrder();
  const selectedRegion = syrianRegions.find((item) => item.id === selectedRegionId) || syrianRegions[0];
  const selectRegion = (region: SyrianRegion) => {
    setSelectedRegionId(region.id);
    setSelectedArea(region.areas[0]);
  };
  const locationLabel = `${selectedRegion.name}، ${selectedArea}`;
  const submitOrder = () => {
    setSubmitError('');
    if (!isSignedIn) {
      try { localStorage.setItem('mwd_name', name); localStorage.setItem('mwd_phone', phone); } catch { /* ignore */ }
      onSuccess(`NA-${Date.now().toString().slice(-6)}`, locationLabel);
      return;
    }
    createOrder.mutate(
      { data: { customerName: name, phone, location: locationLabel, address, notes: notes || undefined, total, items } },
      {
        onSuccess: (order) => {
          queryClient.invalidateQueries({ queryKey: getListMyOrdersQueryKey() });
          onSuccess(order.reference, order.location);
        },
        onError: () => setSubmitError('تعذّر حفظ الطلب، حاول مرة أخرى.'),
      },
    );
  };

  return <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[#262626]/45 p-0 backdrop-blur-sm sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-labelledby="checkout-title" data-testid="checkout-dialog">
    <div className="max-h-[94dvh] w-full max-w-[880px] overflow-y-auto rounded-t-[24px] bg-[#ffffff] shadow-2xl sm:rounded-[26px]">
      <div className="flex items-start justify-between border-b border-[#e5e7eb] px-6 py-5">
        <div><span className="text-xs font-extrabold tracking-[.15em] text-[#bc8e46]">حجز الطلب</span><h2 id="checkout-title" className="mt-1 text-xl font-extrabold text-[#262626]">أرسل تفاصيل التوصيل</h2><p className="mt-1 text-xs leading-6 text-[#77807c]">سيتم التواصل معك لتأكيد السعر وموعد التسليم داخل سورية.</p></div>
        <button onClick={onClose} className="rounded-lg p-2 text-[#536363] hover:bg-[#f3f4f6]" aria-label="إغلاق نموذج حجز الطلب" data-testid="button-close-checkout"><X size={21} /></button>
      </div>
      <form className="space-y-4 px-6 py-5" onSubmit={(event) => { event.preventDefault(); submitOrder(); }}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block"><span className="mb-1.5 block text-xs font-extrabold text-[#262626]">الاسم الكامل <b className="text-[#bc8e46]">*</b></span><input value={name} onChange={(event) => setName(event.target.value)} required minLength={2} placeholder="اكتب اسمك الكامل" className="h-11 w-full rounded-xl border border-[#d1d5db] bg-white px-3 text-sm outline-none transition focus:border-[#bc8e46] focus:ring-2 focus:ring-[#bc8e46]/10" data-testid="input-order-name" /></label>
          <label className="block"><span className="mb-1.5 block text-xs font-extrabold text-[#262626]">رقم الهاتف <b className="text-[#bc8e46]">*</b></span><input value={phone} onChange={(event) => setPhone(event.target.value)} required inputMode="tel" placeholder="09xxxxxxxx" className="h-11 w-full rounded-xl border border-[#d1d5db] bg-white px-3 text-sm outline-none transition focus:border-[#bc8e46] focus:ring-2 focus:ring-[#bc8e46]/10" data-testid="input-order-phone" /></label>
        </div>
        <div className="rounded-2xl border border-[#e5e7eb] bg-[#f9fafb] p-4">
          <div className="mb-3 flex items-center gap-2"><MapPin size={17} className="text-[#bc8e46]" /><h3 className="text-sm font-extrabold text-[#262626]">اختر منطقة التوصيل من الخريطة</h3></div>
          <SyrianMapPicker selectedRegionId={selectedRegionId} selectedArea={selectedArea} onRegionChange={selectRegion} onAreaChange={setSelectedArea} />
        </div>
        <label className="block"><span className="mb-1.5 block text-xs font-extrabold text-[#262626]">العنوان بالتفصيل <b className="text-[#bc8e46]">*</b></span><textarea value={address} onChange={(event) => setAddress(event.target.value)} required minLength={5} rows={2} placeholder={`الشارع، البناء، أقرب نقطة دالة في ${selectedArea}`} className="w-full resize-none rounded-xl border border-[#d1d5db] bg-white px-3 py-2.5 text-sm leading-6 outline-none transition focus:border-[#bc8e46] focus:ring-2 focus:ring-[#bc8e46]/10" data-testid="textarea-order-address" /></label>
        <label className="block"><span className="mb-1.5 block text-xs font-extrabold text-[#262626]">ملاحظات إضافية <span className="font-medium text-[#9a9d96]">(اختياري)</span></span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} placeholder="وقت مناسب للتوصيل أو تفاصيل عن الموقع" className="w-full resize-none rounded-xl border border-[#d1d5db] bg-white px-3 py-2.5 text-sm leading-6 outline-none transition focus:border-[#bc8e46] focus:ring-2 focus:ring-[#bc8e46]/10" data-testid="textarea-order-notes" /></label>
        <div className="rounded-xl bg-[#f3bd4c]/20 px-4 py-3 text-xs font-bold text-[#262626]"><div className="flex items-center justify-between"><span>إجمالي المنتجات التقريبي</span><span className="mono text-base text-[#bc8e46]">{formatPrice(total)} ل.س</span></div><p className="mt-1 text-[10px] font-medium text-[#77807c]">أجور التوصيل تُحدد حسب المحافظة والكمية قبل التأكيد.</p></div>
        {submitError && <p className="rounded-xl border border-[#f0c8c8] bg-[#fdf0f0] px-4 py-3 text-xs font-bold text-[#dc2626]" role="alert" data-testid="text-order-error">{submitError}</p>}
        {isSignedIn && <p className="text-[10px] font-bold text-[#77807c]">سيُحفظ هذا الطلب في حسابك ويمكنك متابعته من صفحة حسابي.</p>}
        <button type="submit" disabled={createOrder.isPending} className="w-full rounded-xl bg-[#bc8e46] py-3.5 text-sm font-extrabold text-white shadow-[3px_3px_0_#f3bd4c] transition hover:bg-[#9a7034] disabled:cursor-not-allowed disabled:opacity-60" data-testid="button-submit-order">{createOrder.isPending ? 'جارٍ حفظ الطلب…' : <>تأكيد حجز الطلب <ArrowLeft className="mr-2 inline" size={17} /></>}</button>
      </form>
    </div>
  </div>;
}

function CartDrawer({ open, onClose, cart, onChangeQty, onCheckout }: { open: boolean; onClose: () => void; cart: Record<string, number>; onChangeQty: (id: string, delta: number) => void; onCheckout: (total: number) => void }) {
  const items = products.filter(p => cart[p.id]);
  const total = items.reduce((sum, p) => sum + p.price * (cart[p.id] || 0), 0);
   return <>{open && <div className="fixed inset-0 z-40 bg-[#262626]/35 backdrop-blur-[2px]" onClick={onClose} data-testid="cart-overlay" />}<aside className={`fixed bottom-0 left-0 top-0 z-50 flex w-full max-w-[420px] flex-col bg-[#ffffff] shadow-[15px_0_40px_rgba(21,52,59,.18)] transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full'}`} aria-label="سلة التسوق" data-testid="cart-drawer"><div className="flex items-center justify-between border-b border-[#e5e7eb] px-6 py-5"><div><h2 className="text-lg font-extrabold text-[#262626]">سلة المشتريات</h2><p className="mt-1 text-xs text-[#77807c]">{items.length ? `${items.length} منتجات جاهزة للطلب` : 'ابدأ بإضافة ما تحتاجه لموقعك'}</p></div><button onClick={onClose} className="rounded-lg p-2 text-[#536363] hover:bg-[#f3f4f6]" aria-label="إغلاق السلة" data-testid="button-close-cart"><X size={21} /></button></div>{items.length ? <><div className="flex-1 overflow-auto px-5 py-4">{items.map(p => <div key={p.id} className="flex gap-3 border-b border-[#e5e7eb] py-4" data-testid={`cart-item-${p.id}`}><img src={p.image} alt="" className="h-20 w-20 rounded-lg object-cover" /><div className="min-w-0 flex-1"><h3 className="text-sm font-bold leading-6 text-[#262626]">{p.name}</h3><div className="mt-1 mono text-sm font-bold text-[#bc8e46]">{formatPrice(p.price)} ل.س</div><div className="mt-2 flex items-center gap-2"><button onClick={() => onChangeQty(p.id, -1)} className="rounded-md border border-[#d1d5db] p-1" aria-label="تقليل الكمية" data-testid={`button-decrease-${p.id}`}><Minus size={13} /></button><span className="min-w-5 text-center text-xs font-bold" data-testid={`text-quantity-${p.id}`}>{cart[p.id]}</span><button onClick={() => onChangeQty(p.id, 1)} className="rounded-md border border-[#d1d5db] p-1" aria-label="زيادة الكمية" data-testid={`button-increase-${p.id}`}><Plus size={13} /></button></div></div></div>)}</div><div className="border-t border-[#e5e7eb] bg-[#f9fafb] p-5"><div className="mb-4 flex justify-between text-sm font-bold"><span>الإجمالي التقريبي</span><span className="mono text-lg text-[#bc8e46]">{formatPrice(total)} ل.س</span></div><button onClick={() => onCheckout(total)} className="w-full rounded-xl bg-[#bc8e46] py-3.5 text-sm font-extrabold text-white transition hover:bg-[#9a7034]" data-testid="button-checkout">إتمام الطلب <ArrowLeft className="mr-2 inline" size={17} /></button><p className="mt-3 text-center text-[10px] text-[#77807c]">خطوة واحدة فقط — الاسم ورقم الهاتف ومكان التوصيل</p></div></> : <div className="flex flex-1 flex-col items-center justify-center px-8 text-center"><div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#f3bd4c]/30 text-[#bc8e46]"><ShoppingBag size={28} /></div><h3 className="mt-5 font-extrabold text-[#262626]">السلة تنتظر أول طلب</h3><p className="mt-2 text-sm leading-7 text-[#77807c]">أضف المنتجات التي تحتاجها وسنجهزها لك بسرعة.</p><button onClick={onClose} className="mt-5 rounded-xl bg-[#262626] px-5 py-3 text-xs font-bold text-white" data-testid="button-continue-shopping">تابع التسوق</button></div>}</aside></>;
}

function Footer() {
  return <footer className="mt-20 bg-[#262626] text-[#d9e5df]"><div className="container-wide grid gap-10 py-12 sm:grid-cols-[1.5fr_1fr_1fr_1fr]"><div><div className="mb-4 brightness-0 invert"><Logo /></div><p className="max-w-[250px] text-sm leading-7 text-[#9db6ae]">من أول لبنة إلى آخر لمسة — موادك شريكك، والمشروع يمشي.</p><div className="mt-6 flex items-center gap-2 text-[10px] font-bold text-[#f3bd4c]"><PackageCheck size={16} /> منصة مواد البناء التي تفهم موقعك</div></div>{[['خدمة العملاء', 'تواصل معنا', 'الأسئلة الشائعة', 'سياسة الاسترجاع'], ['عن موادك', 'قصتنا', 'كن مورداً', 'وظائف'], ['تسوق معنا', 'مواد البناء', 'الدهانات', 'الأدوات الصحية']].map(([title, ...links]) => <div key={title}><h3 className="mb-4 text-sm font-extrabold text-white">{title}</h3>{links.map(link => <Link key={link} href={link === 'مواد البناء' ? '/category/raw' : link === 'الدهانات' ? '/category/paint' : link === 'الأدوات الصحية' ? '/category/health' : '#'} className="mb-3 block text-xs text-[#9db6ae] transition hover:text-[#f3bd4c]" data-testid={`footer-${link}`}>{link}</Link>)}</div>)}</div><div className="border-t border-white/10"><div className="container-wide flex flex-col gap-2 py-5 text-[10px] text-[#77928b] sm:flex-row sm:justify-between"><span>© 2026 موادك لمواد البناء. جميع الحقوق محفوظة.</span><span>صنع للمشاريع التي تستحق أن تُبنى جيداً</span></div></div></footer>;
}

function LocationDialog({ location, onChange, onClose }: { location: string; onChange: (value: string) => void; onClose: () => void }) {
  const initialSelection = getLocationSelection(location);
  const [selectedRegionId, setSelectedRegionId] = useState(initialSelection.region.id);
  const [selectedArea, setSelectedArea] = useState(initialSelection.area);
  const selectedRegion = syrianRegions.find((item) => item.id === selectedRegionId) || syrianRegions[0];
  const selectRegion = (region: SyrianRegion) => {
    setSelectedRegionId(region.id);
    setSelectedArea(region.areas[0]);
  };
  return <div className="fixed inset-0 z-[65] flex items-end justify-center bg-[#262626]/45 p-0 backdrop-blur-sm sm:items-center sm:p-5" role="dialog" aria-modal="true" data-testid="location-dialog"><div className="max-h-[94dvh] w-full max-w-[1080px] overflow-y-auto rounded-t-[24px] bg-[#ffffff] p-4 shadow-[0_30px_80px_rgba(0,0,0,.28)] sm:rounded-[28px] sm:p-7"><div className="flex items-start justify-between"><div><span className="text-xs font-extrabold tracking-[.15em] text-[#bc8e46]">التوصيل داخل سورية</span><h2 className="mt-1 text-xl font-extrabold text-[#262626]">حدد منطقتك من الخريطة</h2><p className="mt-1 text-xs leading-6 text-[#77807c]">اضغط على المحافظة ثم اختر المدينة أو المنطقة التابعة لها.</p></div><button onClick={onClose} aria-label="إغلاق اختيار الموقع" className="rounded-lg p-2 hover:bg-[#f3f4f6]" data-testid="button-close-location"><X size={20} /></button></div><div className="mt-5"><SyrianMapPicker selectedRegionId={selectedRegionId} selectedArea={selectedArea} onRegionChange={selectRegion} onAreaChange={setSelectedArea} /></div><div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button onClick={onClose} className="rounded-xl border border-[#d1d5db] px-5 py-3 text-sm font-bold text-[#536363]" data-testid="button-cancel-location">إلغاء</button><button onClick={() => { onChange(`${selectedRegion.name}، ${selectedArea}`); onClose(); }} className="rounded-xl bg-[#bc8e46] px-5 py-3 text-sm font-extrabold text-white shadow-[3px_3px_0_#f3bd4c]" data-testid="button-confirm-location">تأكيد موقع التوصيل</button></div></div></div>;
}

function SiteShell({ children }: PropsWithChildren) {
  const store = useStore();
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [orderReference, setOrderReference] = useState('');
  const [, setPath] = useLocation();
  const total = products.reduce((sum, product) => sum + product.price * (store.cart[product.id] || 0), 0);
  const completeOrder = (reference: string, location: string) => {
    setCheckoutOpen(false);
    store.clearCart();
    store.setLocation(location);
    setOrderReference(reference);
  };
  return <div className="grain min-h-[100dvh] overflow-x-hidden bg-[#ffffff]"><Header onCart={() => setCartOpen(true)} cartCount={store.cartCount} onSearch={(value) => { store.setSearch(value); if (value) setPath('/catalog'); }} search={store.search} location={store.location} onLocation={() => setLocationOpen(true)} onAccount={() => setPath('/sign-in')} />{orderReference && <div className="container-wide mt-5"><div className="flex items-start gap-3 rounded-2xl border border-[#a6cbb6] bg-[#e8f4ec] px-4 py-4 text-[#262626]" role="status" data-testid="status-order-success"><PackageCheck className="mt-0.5 shrink-0 text-[#39815c]" size={22} /><div><strong className="block text-sm font-extrabold">تم حجز طلبك بنجاح</strong><span className="mt-1 block text-xs leading-6">رقم الطلب: <b className="mono">{orderReference}</b> — موقع التوصيل: <b>{store.location}</b></span></div><button onClick={() => setOrderReference('')} className="touch-target mr-auto rounded-lg p-1 text-[#536363] hover:bg-white/70" aria-label="إغلاق تأكيد الطلب" data-testid="button-dismiss-order-success"><X size={17} /></button></div></div>}<main className="page-content">{children}</main><Footer /><a href="https://wa.me/963992903454?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%D8%8C%20%D8%A3%D8%B1%D9%8A%D8%AF%20الاستفسار%20عن%20مواد%20البناء" target="_blank" rel="noreferrer" aria-label="التواصل عبر واتساب" title="تواصل معنا عبر واتساب" className="fixed bottom-5 left-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_6px_22px_rgba(37,211,102,.4)] transition hover:-translate-y-1 hover:bg-[#1DA851] hover:shadow-[0_9px_26px_rgba(37,211,102,.48)]" data-testid="button-whatsapp"><RiWhatsappLine size={30} strokeWidth={1.8} /></a><CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} cart={store.cart} onChangeQty={store.changeQty} onCheckout={() => { setCartOpen(false); setCheckoutOpen(true); }} />{checkoutOpen && <CheckoutForm total={total} items={products.filter((product) => store.cart[product.id]).map((product) => ({ productId: product.id, name: product.name, quantity: store.cart[product.id], unitPrice: product.price }))} initialLocation={store.location} onClose={() => setCheckoutOpen(false)} onSuccess={completeOrder} />}{locationOpen && <LocationDialog location={store.location} onChange={store.setLocation} onClose={() => setLocationOpen(false)} />}</div>;
}

function FeaturedProducts({ onAdd, cart, onChangeQty }: { onAdd: (p: Product) => void; cart: Record<string, number>; onChangeQty?: (id: string, delta: number) => void }) {
  const store = useStore();
  const featuredIds = ['cement', 'rebar', 'sand', 'blocks', 'wood-plywood', 'tiles'];
  const featured = products.filter(p => featuredIds.includes(p.id));
  return (
    <section className="container-wide mt-10" id="featured">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xl font-extrabold text-[#262626] sm:text-2xl">
          <Flame size={20} className="text-[#bc8e46]" />
          أسعار اليوم — الأكثر طلباً
        </h2>
        <span className="text-xs font-semibold text-[#77807c]">تحديث مباشر</span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {featured.map((p) => (
          <ProductCard key={p.id} product={p} favorite={store.favorites.includes(p.id)} onFavorite={() => store.toggleFavorite(p.id)} onAdd={() => onAdd(p)} selected={!!(cart[p.id] || store.cart[p.id])} quantity={cart[p.id] || store.cart[p.id] || 0} onChangeQty={(delta) => onChangeQty?.(p.id, delta)} />
        ))}
      </div>
    </section>
  );
}

function Home() {
  const store = useStore();
  const [category, setCategory] = useState('all');
  const [slide, setSlide] = useState(0);
  const [, setLocation] = useLocation();
  return <SiteShell><Hero slide={slide} onSlide={setSlide} onCta={() => setLocation('/products')} /><FeaturedProducts onAdd={store.addProduct} cart={store.cart} onChangeQty={store.changeQty} /><CategorySection active={category} onCategory={(value) => { setCategory(value); if (value !== 'all') setLocation(`/category/${value}`); }} /><ProductSection active={category} search={store.search} onAdd={store.addProduct} favorites={store.favorites} onFavorite={store.toggleFavorite} cart={store.cart} onChangeQty={store.changeQty} /><ValueStrip /><Newsletter /></SiteShell>;
}

function PageHeading({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return <div className="container-wide pt-7 sm:pt-9"><span className="text-xs font-extrabold tracking-[.17em] text-[#bc8e46]">{eyebrow}</span><h1 className="mt-1 text-3xl font-extrabold tracking-tight text-[#262626] sm:text-5xl">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-7 text-[#77807c]">{text}</p></div>;
}

function CatalogPage({ categoryId, offersOnly = false }: { categoryId?: string; offersOnly?: boolean }) {
  const store = useStore();
  const [, setLocation] = useLocation();
  const category = categories.find((item) => item.id === categoryId);
  const [sort, setSort] = useState('featured');
  const [view, setView] = useState<'grid' | 'compact'>('grid');
  const [subcategory, setSubcategory] = useState('all');
  const [brand, setBrand] = useState('all');
  const [maxPrice, setMaxPrice] = useState(3000000);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const scopedProducts = products.filter((product) => (!categoryId || product.category === categoryId) && (!offersOnly || product.oldPrice || product.badge?.includes('عرض')));
  const subcategories = [...new Set(scopedProducts.map((product) => product.subcategory).filter(Boolean))] as string[];
  const brands = [...new Set(scopedProducts.map((product) => product.brand).filter(Boolean))] as string[];
  const visible = scopedProducts
    .filter((product) => (subcategory === 'all' || product.subcategory === subcategory) && (brand === 'all' || product.brand === brand) && product.price <= maxPrice && (!store.search || `${product.name} ${product.categoryLabel} ${product.subcategory || ''} ${product.brand || ''}`.includes(store.search)))
    .sort((a, b) => sort === 'low' ? a.price - b.price : sort === 'high' ? b.price - a.price : 0);
  const resetFilters = () => { setSubcategory('all'); setBrand('all'); setMaxPrice(3000000); store.setSearch(''); };

  // تجميع النتائج حسب الفئة عند البحث عبر كل الفئات
  const isGlobalSearch = !!store.search && !categoryId && !offersOnly;
  const grouped = isGlobalSearch
    ? Object.entries(
        visible.reduce((acc, p) => {
          const key = p.categoryLabel;
          if (!acc[key]) acc[key] = { items: [], categoryId: p.category };
          acc[key].items.push(p);
          return acc;
        }, {} as Record<string, { items: Product[]; categoryId: string }>)
      )
    : null;

  return <SiteShell>
    <PageHeading
      eyebrow={offersOnly ? 'اختيارات لا تفوتها' : store.search ? `نتائج البحث` : category ? category.sub : 'كتالوج موادك'}
      title={offersOnly ? 'عروض الأسبوع' : store.search ? `"${store.search}"` : category ? category.name : 'كل المنتجات'}
      text={offersOnly ? 'أسعار خاصة على منتجات مختارة للمشاريع والبيوت، لفترة محدودة.' : store.search ? `${visible.length} نتيجة من كل الفئات` : 'كل مواد مشروعك في صفحة واحدة: منتجات واضحة، فلاتر سهلة، وأسعار بالليرة السورية.'}
    />
    <section className="container-wide mt-5 overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white">
      <div className="flex items-center justify-between border-b border-[#e5e7eb] bg-[#f9fafb] px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-extrabold text-[#262626]"><SlidersHorizontal size={18} className="text-[#bc8e46]" /> تصفية المنتجات</div>
        <div className="flex items-center gap-3"><button onClick={() => setFiltersOpen((open) => !open)} className="touch-target inline-flex items-center gap-1 rounded-lg px-2 text-xs font-bold text-[#262626] hover:bg-white lg:hidden" aria-expanded={filtersOpen} data-testid="button-toggle-filters"><SlidersHorizontal size={15} />{filtersOpen ? 'إخفاء' : 'عرض الفلاتر'}</button><button onClick={resetFilters} className="text-xs font-bold text-[#bc8e46] hover:underline" data-testid="button-reset-filters">إعادة ضبط الفلاتر</button></div>
      </div>
      <div className="grid gap-5 p-4 lg:grid-cols-[210px_1fr]">
        <aside className={`${filtersOpen ? 'block' : 'hidden'} space-y-5 border-b border-[#e5e7eb] pb-4 lg:block lg:border-b-0 lg:border-l lg:pl-5`} aria-label="فلاتر المنتجات">
          <div><h3 className="mb-3 text-xs font-extrabold text-[#262626]">التصنيف الفرعي</h3><div className="space-y-2">{subcategories.length ? subcategories.map((item) => <label key={item} className="flex cursor-pointer items-center gap-2 text-xs text-[#5d6969]"><input type="radio" name="subcategory" checked={subcategory === item} onChange={() => setSubcategory(item)} className="accent-[#bc8e46]" />{item}</label>) : <span className="text-xs text-[#9a9d96]">كل منتجات القسم</span>}<label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-[#bc8e46]"><input type="radio" name="subcategory" checked={subcategory === 'all'} onChange={() => setSubcategory('all')} className="accent-[#bc8e46]" />كل التصنيفات</label></div></div>
          <div><h3 className="mb-3 text-xs font-extrabold text-[#262626]">الماركة</h3><div className="space-y-2">{brands.length ? brands.map((item) => <label key={item} className="flex cursor-pointer items-center gap-2 text-xs text-[#5d6969]"><input type="radio" name="brand" checked={brand === item} onChange={() => setBrand(item || 'all')} className="accent-[#bc8e46]" />{item}</label>) : <span className="text-xs text-[#9a9d96]">كل الماركات</span>}<label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-[#bc8e46]"><input type="radio" name="brand" checked={brand === 'all'} onChange={() => setBrand('all')} className="accent-[#bc8e46]" />كل الماركات</label></div></div>
          <div><div className="mb-3 flex items-center justify-between"><h3 className="text-xs font-extrabold text-[#262626]">السعر حتى</h3><span className="mono text-[10px] text-[#bc8e46]">{formatPrice(maxPrice)} ل.س</span></div><input type="range" min="100000" max="3000000" step="50000" value={maxPrice} onChange={(event) => setMaxPrice(Number(event.target.value))} className="w-full accent-[#bc8e46]" aria-label="الحد الأعلى للسعر" data-testid="range-max-price" /></div>
        </aside>
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-bold text-[#262626]">
              <LayoutGrid size={17} className="text-[#bc8e46]" />
              <span data-testid="text-result-count">{visible.length} {isGlobalSearch ? 'نتيجة' : 'منتج متاح'}</span>
            </div>
            <div className="flex items-center gap-2">
              <select value={sort} onChange={(event) => setSort(event.target.value)} className="h-10 rounded-xl border border-[#d1d5db] bg-[#ffffff] px-3 text-xs font-bold text-[#262626] outline-none" aria-label="ترتيب المنتجات" data-testid="select-sort-products"><option value="featured">الأكثر طلباً</option><option value="low">السعر: الأقل أولاً</option><option value="high">السعر: الأعلى أولاً</option></select>
              {!isGlobalSearch && <>
                <button onClick={() => setView('grid')} className={`rounded-lg p-2 ${view === 'grid' ? 'bg-[#262626] text-white' : 'bg-[#f9fafb] text-[#77807c]'}`} aria-label="عرض شبكي" data-testid="button-grid-view"><LayoutGrid size={16} /></button>
                <button onClick={() => setView('compact')} className={`rounded-lg p-2 ${view === 'compact' ? 'bg-[#262626] text-white' : 'bg-[#f9fafb] text-[#77807c]'}`} aria-label="عرض مضغوط" data-testid="button-compact-view"><Menu size={16} /></button>
              </>}
            </div>
          </div>
          {visible.length === 0 && (
            <div className="rounded-2xl border border-dashed border-[#d1d5db] bg-[#f9fafb] py-20 text-center">
              <Search className="mx-auto text-[#bc8e46]" size={34} />
              <h2 className="mt-4 text-lg font-extrabold text-[#262626]">لا توجد منتجات مطابقة</h2>
              <p className="mt-2 text-sm text-[#77807c]">جرّب تغيير الفلاتر أو كلمة البحث.</p>
              <button onClick={resetFilters} className="button-primary mt-5" data-testid="button-reset-catalog">عرض كل المنتجات</button>
            </div>
          )}
          {/* عرض مجمّع حسب الفئة عند البحث الشامل */}
          {isGlobalSearch && grouped && grouped.length > 0 && (
            <div className="space-y-8" data-testid="search-results-grouped">
              {grouped.map(([catLabel, { items, categoryId: catId }]) => (
                <div key={catLabel}>
                  <div className="mb-3 flex items-center gap-3">
                    <button
                      onClick={() => { store.setSearch(''); setLocation(`/category/${catId}`); }}
                      className="flex items-center gap-2 rounded-lg border border-[#e5e7eb] bg-[#faf6ec] px-3 py-1.5 text-xs font-extrabold text-[#262626] transition hover:border-[#bc8e46] hover:text-[#bc8e46]"
                      data-testid={`search-category-${catId}`}
                    >
                      {catLabel}
                    </button>
                    <span className="rounded-full bg-[#bc8e46]/15 px-2.5 py-0.5 text-[11px] font-bold text-[#bc8e46]" data-testid={`search-count-${catId}`}>
                      {items.length} {items.length === 1 ? 'منتج' : 'منتجات'}
                    </span>
                    <div className="h-px flex-1 bg-[#e5e7eb]" />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                    {items.map((product) => (
                      <ProductCard key={product.id} product={product} favorite={store.favorites.includes(product.id)} onFavorite={() => store.toggleFavorite(product.id)} onAdd={() => store.addProduct(product)} selected={!!store.cart[product.id]} quantity={store.cart[product.id] || 0} onChangeQty={(delta) => store.changeQty(product.id, delta)} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          {/* عرض عادي (بدون بحث أو مع فئة محددة) */}
          {!isGlobalSearch && visible.length > 0 && (
            <div className={view === 'grid' ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5' : 'grid gap-3 sm:grid-cols-2'}>
              {visible.map((product) => <ProductCard key={product.id} product={product} favorite={store.favorites.includes(product.id)} onFavorite={() => store.toggleFavorite(product.id)} onAdd={() => store.addProduct(product)} selected={!!store.cart[product.id]} quantity={store.cart[product.id] || 0} onChangeQty={(delta) => store.changeQty(product.id, delta)} />)}
            </div>
          )}
        </div>
      </div>
    </section>
  </SiteShell>;
}

function CategoriesPage() {
  const [, setLocation] = useLocation();
  return <SiteShell><PageHeading eyebrow="تسوق على طريقتك" title="كل التصنيفات" text="اختر القسم المناسب لمشروعك واستكشف المنتجات المتوفرة مع صور وأسعار واضحة." /><section className="container-wide mt-10 grid gap-4 pb-6 sm:grid-cols-2 lg:grid-cols-3">{categories.map((category) => <button key={category.id} onClick={() => setLocation(`/category/${category.id}`)} className="group relative h-64 overflow-hidden rounded-2xl text-right shadow-sm transition hover:-translate-y-1 hover:shadow-xl" data-testid={`category-page-${category.id}`}><img src={category.image} alt={category.name} className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" /><div className="absolute inset-0 bg-gradient-to-t from-[#262626]/95 via-[#262626]/25 to-transparent" /><div className="absolute bottom-5 right-5"><h2 className="text-xl font-extrabold text-white">{category.name}</h2><p className="mt-1 text-xs text-[#d9e5df]">{category.sub}</p><span className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-[#f3bd4c]">تصفح القسم <ArrowLeft size={15} /></span></div></button>)}</section></SiteShell>;
}

function ProductDetailPage({ productId }: { productId: string }) {
  const store = useStore();
  const product = products.find((item) => item.id === productId);
  const [, setLocation] = useLocation();
  if (!product) return <SiteShell><div className="container-wide py-24 text-center"><PackageCheck className="mx-auto text-[#bc8e46]" size={40} /><h1 className="mt-4 text-2xl font-extrabold text-[#262626]">المنتج غير موجود</h1><button onClick={() => setLocation('/catalog')} className="mt-5 rounded-xl bg-[#262626] px-5 py-3 text-sm font-bold text-white">العودة للكتالوج</button></div></SiteShell>;
  const related = products.filter((item) => item.category === product.category && item.id !== product.id).slice(0, 4);
      return <SiteShell><div className="container-wide pt-8 text-xs font-bold text-[#8a8f88]"><Link href="/" className="hover:text-[#bc8e46]">الرئيسية</Link><span className="mx-2">/</span><Link href={`/category/${product.category}`} className="hover:text-[#bc8e46]">{product.categoryLabel}</Link><span className="mx-2">/</span><span>{product.name}</span></div><section className="container-wide mt-6 grid gap-8 pb-8 lg:grid-cols-2"><div className="relative overflow-hidden rounded-[24px] border border-[#e5e7eb] bg-[#f2eadf]"><img src={product.image} alt={product.name} className="h-full min-h-[360px] w-full object-cover" />{product.badge && <span className="absolute right-5 top-5 rounded-lg bg-[#f3bd4c] px-3 py-2 text-xs font-extrabold text-[#262626]">{product.badge}</span>}</div><div className="flex flex-col justify-center"><span className="text-xs font-extrabold tracking-[.16em] text-[#bc8e46]">{product.categoryLabel}</span><h1 className="mt-3 text-3xl font-extrabold leading-[1.35] text-[#262626] sm:text-4xl">{product.name}</h1>{product.specs && <div className="mt-4 rounded-xl border border-[#e8c367] bg-[#f3bd4c] px-4 py-3 text-sm font-bold text-[#3a2400] shadow-[0_2px_8px_rgba(188,142,70,.25)]" data-testid={`text-detail-specs-${product.id}`}>{product.specs}</div>}
                      <div className="mt-4 flex items-center gap-2 text-sm text-[#77807c]"><RatingStars rating={product.rating} /><span>•</span><span>{product.unit}</span><span>•</span><span>متوفر للشحن</span></div><div className="mt-7 rounded-2xl bg-[#f9fafb] p-5"><span className="text-xs font-bold text-[#77807c]">سعر الوحدة</span><div className="mt-2 flex items-baseline gap-2"><strong className="mono text-3xl text-[#bc8e46]">{formatPrice(product.price)}</strong><span className="text-sm font-extrabold text-[#77807c]">ل.س / {product.unit}</span></div>{product.priceUSD && <div className="mt-1 text-sm font-bold text-[#bc8e46]">${product.priceUSD}</div>}{product.oldPrice && <div className="mt-2 text-xs text-[#a7a29a] line-through">{formatPrice(product.oldPrice)} ل.س</div>}</div><div className="mt-6 flex flex-wrap gap-3"><button onClick={() => store.addProduct(product)} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#bc8e46] px-5 py-4 text-sm font-extrabold text-white shadow-[3px_3px_0_#f3bd4c]" data-testid={`button-detail-add-${product.id}`}><ShoppingBag size={18} /> أضف إلى السلة</button><button onClick={() => store.toggleFavorite(product.id)} className={`rounded-xl border px-4 py-4 ${store.favorites.includes(product.id) ? 'border-[#bc8e46] bg-[#fff3e9] text-[#bc8e46]' : 'border-[#d1d5db] text-[#262626]'}`} aria-label="تبديل المفضلة" data-testid={`button-detail-favorite-${product.id}`}><Heart fill={store.favorites.includes(product.id) ? 'currentColor' : 'none'} size={19} /></button></div><div className="mt-7 grid grid-cols-3 gap-2 text-center text-[10px] font-bold text-[#77807c]"><div className="rounded-xl bg-[#e8eee8] p-3"><Truck className="mx-auto mb-1 text-[#bc8e46]" size={17} />توصيل داخل سورية</div><div className="rounded-xl bg-[#e8eee8] p-3"><ShieldCheck className="mx-auto mb-1 text-[#bc8e46]" size={17} />منتج موثوق</div><div className="rounded-xl bg-[#e8eee8] p-3"><PackageCheck className="mx-auto mb-1 text-[#bc8e46]" size={17} />تجهيز سريع</div></div></div></section>{related.length > 0 && <section className="container-wide border-t border-[#e5e7eb] pt-10"><h2 className="text-2xl font-extrabold text-[#262626]">منتجات قد تناسبك</h2><div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{related.map((item) => <ProductCard key={item.id} product={item} favorite={store.favorites.includes(item.id)} onFavorite={() => store.toggleFavorite(item.id)} onAdd={() => store.addProduct(item)} selected={!!store.cart[item.id]} quantity={store.cart[item.id] || 0} onChangeQty={(delta) => store.changeQty(item.id, delta)} />)}</div></section>}</SiteShell>;
}

const orderStatusLabels: Record<string, string> = {
  pending: 'قيد المراجعة',
  confirmed: 'مؤكد',
  delivering: 'قيد التوصيل',
  delivered: 'تم التسليم',
  cancelled: 'ملغى',
};

function MyOrdersSection() {
  const { data: orders, isLoading, isError } = useListMyOrders();
  return <section className="container-wide mt-2 pb-12">
    <div className="rounded-[24px] border border-[#e5e7eb] bg-white p-6 sm:p-8">
      <div className="flex items-center gap-2"><PackageCheck size={20} className="text-[#bc8e46]" /><h2 className="text-xl font-extrabold text-[#262626]">طلباتي</h2></div>
      {isLoading && <p className="mt-5 text-sm font-bold text-[#77807c]" data-testid="text-orders-loading">جارٍ تحميل طلباتك…</p>}
      {isError && <p className="mt-5 text-sm font-bold text-[#dc2626]" data-testid="text-orders-error">تعذّر تحميل الطلبات، حدّث الصفحة وحاول مجدداً.</p>}
      {orders && orders.length === 0 && <div className="mt-5 rounded-2xl border border-dashed border-[#d1d5db] bg-[#f9fafb] px-5 py-10 text-center" data-testid="text-orders-empty"><ShoppingBag className="mx-auto text-[#bc8e46]" size={28} /><p className="mt-3 text-sm font-extrabold text-[#262626]">لا توجد طلبات بعد</p><p className="mt-1 text-xs text-[#77807c]">أول طلب تحجزه وأنت مسجّل دخول سيظهر هنا مع حالته.</p></div>}
      {orders && orders.length > 0 && <div className="mt-5 space-y-4">{orders.map((order) => <div key={order.id} className="rounded-2xl border border-[#e5e7eb] bg-[#f9fafb] p-5" data-testid={`order-card-${order.reference}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><span className="text-xs font-bold text-[#77807c]">رقم الطلب</span><strong className="mono block text-sm text-[#262626]" data-testid={`text-order-reference-${order.reference}`}>{order.reference}</strong></div>
          <span className="rounded-full bg-[#f3bd4c]/25 px-3 py-1.5 text-xs font-extrabold text-[#a06f10]" data-testid={`text-order-status-${order.reference}`}>{orderStatusLabels[order.status] || order.status}</span>
        </div>
        <div className="mt-3 grid gap-2 text-xs font-bold text-[#77807c] sm:grid-cols-3">
          <span>التاريخ: <b className="text-[#262626]">{new Date(order.createdAt).toLocaleDateString('ar-SY', { year: 'numeric', month: 'long', day: 'numeric' })}</b></span>
          <span>التوصيل إلى: <b className="text-[#262626]">{order.location}</b></span>
          <span>الإجمالي: <b className="mono text-[#bc8e46]">{formatPrice(order.total)} ل.س</b></span>
        </div>
        {order.items.length > 0 && <div className="mt-3 border-t border-[#e5e7eb] pt-3 text-xs leading-7 text-[#5d6969]">{order.items.map((item) => <div key={item.productId} className="flex justify-between"><span>{item.name} × {item.quantity}</span><span className="mono">{formatPrice(item.unitPrice * item.quantity)} ل.س</span></div>)}</div>}
      </div>)}</div>}
    </div>
  </section>;
}

function AccountPage() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const [, setLocation] = useLocation();
  if (!isLoaded) return <SiteShell><div className="container-wide py-24 text-center text-sm font-bold text-[#77807c]">جارٍ التحميل…</div></SiteShell>;
  if (!user) {
    return <SiteShell><div className="container-wide py-24 text-center"><UserRound className="mx-auto text-[#bc8e46]" size={40} /><h1 className="mt-4 text-2xl font-extrabold text-[#262626]">سجّل دخولك أولاً</h1><p className="mt-2 text-sm text-[#77807c]">تحتاج حساباً لعرض هذه الصفحة.</p><div className="mt-6 flex justify-center gap-3"><button onClick={() => setLocation('/sign-in')} className="rounded-xl bg-[#bc8e46] px-6 py-3 text-sm font-extrabold text-white transition hover:bg-[#9a7034]" data-testid="button-go-sign-in">تسجيل الدخول</button><button onClick={() => setLocation('/sign-up')} className="rounded-xl border border-[#d1d5db] px-6 py-3 text-sm font-extrabold text-[#262626] transition hover:border-[#bc8e46] hover:text-[#bc8e46]" data-testid="button-go-sign-up">حساب جديد</button></div></div></SiteShell>;
  }
  const displayName = user.fullName || user.firstName || user.primaryEmailAddress?.emailAddress || 'مستخدم موادك';
  return <SiteShell><PageHeading eyebrow="مساحتك في موادك" title={`أهلاً ${displayName}`} text="تابع طلباتك واحفظ منتجاتك المفضلة وخلّي طلبات المشاريع أسهل." /><section className="container-wide mt-8 grid gap-8 pb-10 lg:grid-cols-[1fr_1.1fr]"><div className="rounded-[24px] bg-[#262626] p-8 text-[#fff8ef]"><span className="text-xs font-extrabold tracking-[.16em] text-[#f3bd4c]">موادك للمحترفين</span><h2 className="mt-4 text-3xl font-extrabold leading-tight">كل مشروعك،<br />بمكان واحد.</h2><p className="mt-5 text-sm leading-8 text-[#d9e5df]">احفظ منتجاتك، راجع طلباتك، وخلّي تفاصيل التوصيل جاهزة من أول مرة.</p><div className="mt-8 space-y-4 text-sm font-bold">{['حفظ المنتجات المفضلة', 'تتبع حالة الطلب', 'عناوين توصيل أسرع'].map((item) => <div key={item} className="flex items-center gap-3"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f3bd4c] text-[#262626]"><Check size={15} /></span>{item}</div>)}</div></div><div className="rounded-[24px] border border-[#e5e7eb] bg-white p-6 sm:p-8"><h2 className="text-xl font-extrabold text-[#262626]">معلومات الحساب</h2><div className="mt-6 space-y-4"><div className="rounded-xl bg-[#f9fafb] p-4"><span className="text-xs font-bold text-[#77807c]">الاسم</span><strong className="mt-1 block text-sm text-[#262626]" data-testid="text-account-name">{displayName}</strong></div><div className="rounded-xl bg-[#f9fafb] p-4"><span className="text-xs font-bold text-[#77807c]">البريد الإلكتروني</span><strong className="mt-1 block text-sm text-[#262626]" data-testid="text-account-email">{user.primaryEmailAddress?.emailAddress || '—'}</strong></div></div><button onClick={() => signOut({ redirectUrl: basePath || '/' })} className="mt-7 w-full rounded-xl border border-[#d1d5db] py-3.5 text-sm font-extrabold text-[#262626] transition hover:border-[#dc2626] hover:text-[#dc2626]" data-testid="button-sign-out">تسجيل الخروج</button></div></section><MyOrdersSection /></SiteShell>;
}


function InfoPage({ title, eyebrow, text, children }: PropsWithChildren<{ title: string; eyebrow: string; text: string }>) {
  return <SiteShell><PageHeading eyebrow={eyebrow} title={title} text={text} /><section className="container-wide mt-8 max-w-4xl pb-10"><div className="rounded-[24px] border border-[#e5e7eb] bg-[#ffffff] p-6 text-sm leading-8 text-[#45595b] shadow-sm sm:p-10">{children}</div></section></SiteShell>;
}

function AboutPage() {
  return (
    <SiteShell>
      <section className="relative flex min-h-[330px] items-center overflow-hidden bg-[#263943] sm:min-h-[410px]" data-testid="about-hero">
        <img src="/images/hero-crane.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-[linear-gradient(270deg,rgba(24,38,46,.9)_0%,rgba(24,38,46,.63)_46%,rgba(24,38,46,.28)_100%)]" />
        <div className="container-wide relative z-10 flex justify-end py-12">
          <div className="max-w-[720px] text-right text-white">
            <span className="inline-flex bg-[#bc8e46] px-4 py-2 text-xs font-extrabold">نبني المستقبل معاً</span>
            <h1 className="mt-6 text-3xl font-extrabold leading-[1.45] sm:text-5xl">موادك، شريكك في كل خطوة من مشروعك</h1>
            <p className="mt-5 max-w-[650px] text-sm leading-8 text-white/85 sm:text-base">نوفر لك مواد البناء والتشطيبات من مصادر موثوقة، بتجربة واضحة وخدمة قريبة تساعدك تنجز بثقة.</p>
          </div>
        </div>
      </section>
      <section className="container-wide grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-[.9fr_1.1fr] lg:gap-20" data-testid="about-introduction">
        <div className="relative order-2 lg:order-1">
          <div className="overflow-hidden rounded-2xl bg-[#eef2f1] shadow-[0_16px_40px_rgba(38,38,38,.12)]">
            <img src="/images/hero-warehouse.jpg" alt="فريق يعمل في موقع لمواد البناء" className="aspect-[4/5] w-full object-cover" />
          </div>
          <div className="absolute -right-3 bottom-8 rounded-xl border-r-4 border-[#bc8e46] bg-white px-5 py-4 shadow-lg sm:-right-6">
            <strong className="block text-sm font-extrabold text-[#262626]">حلول متكاملة</strong>
            <span className="mt-1 block text-xs text-[#77807c]">من التخطيط إلى التنفيذ</span>
          </div>
        </div>
        <div className="order-1 text-right lg:order-2">
          <span className="text-xs font-extrabold tracking-[.18em] text-[#bc8e46]">عن موادك</span>
          <h2 className="mt-3 text-2xl font-extrabold leading-[1.5] text-[#262626] sm:text-4xl">من أول لبنة إلى آخر لمسة</h2>
          <p className="mt-5 text-sm leading-8 text-[#66716f]">موادك منصة تجمع احتياجات موقعك في مكان واحد. نساعد أصحاب البيوت والمقاولين وفرق المشاريع على الوصول إلى المنتج المناسب، بالسعر الواضح، والتوصيل المنظم.</p>
          <p className="mt-4 text-sm leading-8 text-[#66716f]">نؤمن أن شراء مواد البناء يجب أن يكون أسهل وأقرب وأكثر شفافية. لذلك نبني تجربة تحترم وقتك وتفهم تفاصيل مشروعك من الكمية حتى التسليم.</p>
          <div className="mt-8 grid grid-cols-3 gap-3 border-t border-[#e5e7eb] pt-7">
            {[['+450', 'منتج متوفر'], ['+900', 'طلب تم تجهيزه'], ['24/7', 'دعم قريب']].map(([number, label]) => (
              <div key={label} className="text-center">
                <strong className="block text-2xl font-extrabold text-[#bc8e46] sm:text-3xl">{number}</strong>
                <span className="mt-1 block text-[10px] font-bold text-[#77807c] sm:text-xs">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="bg-[#f7f8f7] py-14 sm:py-18">
        <div className="container-wide">
          <div className="mb-8 text-right">
            <span className="text-xs font-extrabold tracking-[.18em] text-[#bc8e46]">لماذا موادك؟</span>
            <h2 className="mt-2 text-2xl font-extrabold text-[#262626] sm:text-3xl">نبني تجربة أفضل لمشروعك</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[['اختيارات موثوقة', 'منتجات واضحة من موردين نعرفهم ونثق بجودتهم.'], ['أسعار شفافة', 'تعرف السعر والوحدة قبل أن تضيف المنتج إلى سلتك.'], ['خدمة قريبة', 'فريق موادك موجود ليساعدك من أول اختيار حتى التسليم.']].map(([title, text]) => (
              <article key={title} className="border border-[#e5e7eb] bg-white p-6 text-right">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1b3689]/10 text-[#1b3689]"><BadgeCheck size={20} /></span>
                <h3 className="mt-5 text-base font-extrabold text-[#262626]">{title}</h3>
                <p className="mt-2 text-sm leading-7 text-[#77807c]">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </SiteShell>
  );
}

function SignInPage() {
  return <SiteShell>
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-12">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  </SiteShell>;
}

function SignUpPage() {
  return <SiteShell>
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-12">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  </SiteShell>;
}

function Router() {
  const [, setLocation] = useLocation();
  const [categoryMatch, categoryParams] = useRoute<{ categoryId: string }>('/category/:categoryId');
  const [productMatch, productParams] = useRoute<{ productId: string }>('/product/:productId');
  return <Switch>
    <Route path="/" component={Home} />
    <Route path="/catalog" component={() => <CatalogPage />} />
    <Route path="/products" component={() => <CatalogPage />} />
    <Route path="/categories" component={CategoriesPage} />
    <Route path="/offers" component={() => <CatalogPage offersOnly />} />
    {categoryMatch && <Route path="/category/:categoryId"><CatalogPage categoryId={categoryParams?.categoryId} /></Route>}
    {productMatch && <Route path="/product/:productId"><ProductDetailPage productId={productParams?.productId || ''} /></Route>}
    <Route path="/account" component={AccountPage} />
    {/* REQUIRED — /*? wildcard matches Clerk OAuth sub-paths */}
    <Route path="/sign-in/*?" component={SignInPage} />
    <Route path="/sign-up/*?" component={SignUpPage} />
    <Route path="/about" component={AboutPage} />
    <Route path="/contact" component={() => <InfoPage eyebrow="نحن قريبون" title="تواصل معنا" text="فريق موادك جاهز يساعدك في اختيار المواد ومتابعة التوصيل."><div className="grid gap-4 sm:grid-cols-3">{[['الهاتف', '+966 59 667 8719'], ['واتساب', '+966 59 667 8719'], ['البريد', 'info@mawadak.com']].map(([label, value]) => <div key={label} className="rounded-2xl bg-[#f9fafb] p-5"><span className="text-xs font-bold text-[#bc8e46]">{label}</span><strong className="mt-2 block text-lg text-[#262626]">{value}</strong></div>)}</div><form className="mt-8 grid gap-4 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); setLocation('/contact?sent=1'); }}><input required placeholder="اسمك" className="h-12 rounded-xl border border-[#d1d5db] px-4 outline-none focus:border-[#bc8e46]" data-testid="input-contact-name" /><input required type="tel" placeholder="رقم الهاتف" className="h-12 rounded-xl border border-[#d1d5db] px-4 outline-none focus:border-[#bc8e46]" data-testid="input-contact-phone" /><textarea required placeholder="كيف نساعدك؟" className="min-h-32 rounded-xl border border-[#d1d5db] px-4 py-3 outline-none focus:border-[#bc8e46] sm:col-span-2" data-testid="textarea-contact-message" /><button className="rounded-xl bg-[#bc8e46] py-3.5 text-sm font-extrabold text-white sm:col-span-2" data-testid="button-contact-submit">إرسال الرسالة</button></form></InfoPage>} />
    <Route path="/faq" component={() => <InfoPage eyebrow="أسئلة متكررة" title="كيف نقدر نساعدك؟" text="إجابات مختصرة على أكثر الأسئلة التي تصلنا."><div className="space-y-5">{[['كيف يتم حجز الطلب؟', 'أضف المنتجات إلى السلة، ثم اضغط حجز الطلب وأرسل الاسم ورقم الهاتف ومكان التوصيل. يتواصل معك فريقنا لتأكيد التفاصيل.'], ['هل التوصيل متاح خارج دمشق؟', 'موادك تنسق التوصيل إلى المحافظات السورية حسب المنتج والكمية ومكان التسليم.'], ['هل الأسعار نهائية؟', 'الأسعار المعروضة للمنتجات واضحة، وتُحدد أجور التوصيل قبل تأكيد الطلب النهائي.'], ['هل يمكن طلب كمية للمشاريع؟', 'نعم، تواصل معنا لطلبات المشاريع والكميات الكبيرة للحصول على عرض مناسب.']].map(([question, answer]) => <details key={question} className="rounded-xl border border-[#e5e7eb] bg-[#f9fafb] p-4"><summary className="cursor-pointer font-extrabold text-[#262626]">{question}</summary><p className="mt-3 text-[#77807c]">{answer}</p></details>)}</div></InfoPage>} />
    <Route path="/returns" component={() => <InfoPage eyebrow="خدمة ما بعد الطلب" title="الاسترجاع والاستبدال" text="نحرص أن تكون تجربتك مريحة حتى بعد وصول الطلب."><h2 className="text-xl font-extrabold text-[#262626]">سياسة واضحة</h2><p className="mt-4">إذا وصل المنتج بحالة غير مطابقة أو كان هناك خطأ في الطلب، تواصل معنا خلال 48 ساعة من الاستلام مع رقم الطلب وصورة المنتج. نراجع الحالة وننسق الاستبدال أو الحل المناسب حسب طبيعة المنتج.</p><ul className="mt-6 space-y-3">{['احتفظ بفاتورة أو رقم الطلب', 'لا تستخدم المنتج قبل التواصل عند وجود مشكلة', 'بعض المنتجات المخصصة أو المفتوحة قد لا تكون قابلة للاسترجاع'].map((item) => <li key={item} className="flex items-center gap-2"><Check size={17} className="text-[#bc8e46]" />{item}</li>)}</ul></InfoPage>} />
    <Route component={NotFound} />
  </Switch>;
}

function ApiAuthBridge() {
  const { getToken } = useAuth();
  useEffect(() => {
    setAuthTokenGetter(() => getToken());
    return () => setAuthTokenGetter(null);
  }, [getToken]);
  return null;
}

function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const exitTimer = setTimeout(() => setExiting(true), 1150);
    const completeTimer = setTimeout(onComplete, 1700);
    return () => {
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, []); // Run once to avoid reset on App re-renders

  return (
    <div
      className={`naem-splash ${exiting ? 'naem-splash--exit' : ''}`}
      role="status"
      aria-label="جارٍ تحميل موادك لمواد البناء"
    >
      <img src={`${basePath}/images/mawadak-logo.png`} alt="موادك لمواد البناء" />
    </div>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        ...arSA,
        signIn: { ...arSA.signIn, start: { ...arSA.signIn?.start, title: 'أهلاً بعودتك', subtitle: 'سجّل دخولك لمتابعة طلباتك ومفضلتك' } },
        signUp: { ...arSA.signUp, start: { ...arSA.signUp?.start, title: 'أنشئ حسابك في موادك', subtitle: 'خلّي طلبات مواد البناء أسهل وأسرع' } },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <ApiAuthBridge />
      <StoreProvider><Router /></StoreProvider>
    </ClerkProvider>
  );
}

function App() {
  const [showSplash, setShowSplash] = useState(true);
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={basePath}><ClerkProviderWithRoutes /></WouterRouter><Toaster />{showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}</TooltipProvider></QueryClientProvider>;
}

export default App;
