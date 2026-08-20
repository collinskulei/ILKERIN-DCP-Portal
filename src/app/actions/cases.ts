"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function completeCase(applicationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in." };
  }

  const { data: application, error: fetchErr } = await supabase
    .from("applications")
    .select("stage")
    .eq("id", applicationId)
    .single();

  if (fetchErr || !application) {
    return { error: fetchErr?.message ?? "Application not found." };
  }

  if (application.stage !== "stage_3") {
    return { error: "Only a Stage 3 case can be marked complete." };
  }

  const { error } = await supabase
    .from("applications")
    .update({ status: "complete" })
    .eq("id", applicationId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/cases/${applicationId}`);
  revalidatePath("/");
  return { success: true };
}
