import { useState } from "react";
import { Layout } from "../components/layout/Layout";
import { BoardList } from "../components/board/BoardList";

export function HomePage() {
  const [search, setSearch] = useState("");

  return (
    <Layout
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search boards... (/)"
    >
      <BoardList searchQuery={search} />
    </Layout>
  );
}
