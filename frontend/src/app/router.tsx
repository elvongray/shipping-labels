import {
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";
import AppShell from "../features/layout/AppShell";
import UploadPage from "../features/upload/UploadPage";
import ReviewPage from "../features/review/ReviewPage";
import ShippingPage from "../features/shipping/ShippingPage";
import CheckoutPage from "../features/checkout/CheckoutPage";
import SuccessPage from "../features/checkout/SuccessPage";

const rootRoute = createRootRoute({
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/upload" });
  },
});

const uploadRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/upload",
  component: UploadPage,
});

const reviewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/review/$importId",
  component: ReviewPage,
});

const shippingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/shipping/$importId",
  component: ShippingPage,
});

const checkoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/checkout/$importId",
  component: CheckoutPage,
});

const successRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/success/$importId",
  component: SuccessPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  uploadRoute,
  reviewRoute,
  shippingRoute,
  checkoutRoute,
  successRoute,
]);

export const router = createRouter({
  routeTree,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
