import {
  LayoutDashboard,
  PiggyBank,
  Receipt,
  Upload,
  Target,
  CreditCard,
  Settings, // Kept Settings for completeness, though it's separate in the image
  Goal
} from "lucide-react"

export const navigationConfig = [
  {
    title: "Overview",
    items: [
      {
        title: "Dashboard",
        icon: LayoutDashboard,
        page: "dashboard",
        path: "/dashboard"
      }
    ]
  },
  {
    title: "Transactions",
    items: [
      {
        title: "All Transactions",
        icon: Receipt,
        page: "all-transactions",
        path: "/transactions/all"
      },
      {
        title: "Upload Statements",
        icon: Upload,
        page: "upload-statements",
        path: "/transactions/upload"
      }
    ]
  },
  {
    title: "Planning",
    items: [
      {
        title: "Budget Tracker",
        icon: PiggyBank,
        page: "budget-tracker",
        path: "/planning/budget"
      },
      {
        title: "Financial Goals",
        icon: Goal,
        page: "financial-goals",
        path: "/planning/goals"
      }
    ]
  },
  {
    title: "Credit & Cards",
    items: [
      {
        title: "Credit Cards",
        icon: CreditCard,
        page: "credit-cards",
        path: "/cards"
      }
    ]
  }
]