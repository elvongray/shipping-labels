import { RouterProvider } from "@tanstack/react-router";
import { router } from "./app/router";
import AppProviders from "./app/providers";

function App() {
  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );
}

export default App;
