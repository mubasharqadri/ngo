"use client";
import { CrudPage } from "@/components/CrudPage";
import { Badge } from "@/components/ui/Breadcrumbs";

export default function Page() {
  return (
    <CrudPage
      title="Posts & Columns"
      subtitle="Daily stories, columns and updates for the public website (motivation content)"
      apiBase="/api/posts"
      module="posts"
      singular="Post"
      searchPlaceholder="Search title, category, body..."
      fields={[
        { key: "id", label: "ID", hideInForm: true },
        { key: "title", label: "Title", required: true, section: "Content" },
        { key: "slug", label: "Slug (auto)", hideInTable: true, section: "Content" },
        { key: "category", label: "Category", type: "select", options: [
          { value: "column", label: "Column" }, { value: "story", label: "Story" }, { value: "update", label: "Update" },
        ], section: "Content", render: (v) => <Badge tone={v === "column" ? "violet" : v === "story" ? "sky" : "slate"}>{String(v)}</Badge> },
        { key: "excerpt", label: "Excerpt", type: "textarea", section: "Content", hideInTable: true },
        { key: "body", label: "Body", type: "textarea", section: "Content", hideInTable: true },
        { key: "coverImage", label: "Cover image URL", section: "Media" },
        { key: "author", label: "Author", section: "Publish" },
        { key: "isPublished", label: "Published", type: "boolean", section: "Publish", render: (v) => <Badge tone={v ? "emerald" : "slate"}>{v ? "Live" : "Draft"}</Badge> },
      ]}
    />
  );
}
