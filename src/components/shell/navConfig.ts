import {
  Home,
  Megaphone,
  FileText,
  Image as ImageIcon,
  BarChart2,
  ClipboardList,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Role } from '@/utils/mockAuth';

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
  badge?: 'proposals_pending' | 'creative_attention';
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

export const NAV_CONFIG: Record<Role, NavSection[]> = {
  advertiser: [
    {
      label: '主選單',
      items: [
        { id: 'home', label: '首頁', icon: Home, href: '/' },
      ],
    },
    {
      label: '廣告活動',
      items: [
        { id: 'campaign-planner', label: '活動管理', icon: Megaphone, href: '/campaign-planner' },
        { id: 'proposals', label: '提案確認', icon: FileText, href: '/proposal-review' },
      ],
    },
    {
      label: '素材',
      items: [
        { id: 'assets', label: '素材庫', icon: ImageIcon, href: '/assets', badge: 'creative_attention' },
      ],
    },
    {
      label: '數據',
      items: [
        { id: 'reports', label: '成效報告', icon: BarChart2, href: '/reports' },
      ],
    },
  ],
  sales: [
    {
      label: '主選單',
      items: [
        { id: 'home', label: '首頁', icon: Home, href: '/' },
      ],
    },
    {
      label: '提案管理',
      items: [
        { id: 'proposals-pending', label: '提案跟進', icon: FileText, href: '/proposal-review', badge: 'proposals_pending' },
        { id: 'proposals-all', label: '新增提案', icon: ClipboardList, href: '/proposal-builder' },
        { id: 'clients', label: '客戶管理', icon: Users, href: '/clients' },
      ],
    },
    {
      label: '數據',
      items: [
        { id: 'reports', label: '業績報告', icon: BarChart2, href: '/reports' },
      ],
    },
  ],
  admin: [],
};
