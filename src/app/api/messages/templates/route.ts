import { ok, withAuth } from "@/lib/server-context";
import { DEFAULT_TEMPLATES, TEMPLATE_VARIABLES } from "@/lib/templates";

export const GET = withAuth(async () => {
  return ok({
    templates: DEFAULT_TEMPLATES,
    variables: TEMPLATE_VARIABLES,
  });
});
