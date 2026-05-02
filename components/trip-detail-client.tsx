"use client";

import { useMemo, useState } from "react";
import { Map as MapIcon, List, Wallet } from "lucide-react";
import { MapView } from "./map-view";
import { LocationList } from "./location-list";
import { AddLocationButton } from "./add-location";
import { ImportKmlButton } from "./import-kml-dialog";
import { ExpensesTab } from "./expenses/expenses-tab";
import { CATEGORIES } from "@/lib/types";
import type {
  Location,
  Member,
  Category,
  Expense,
  Settlement,
} from "@/lib/types";

type SortKey = "manual" | "rating" | "visit_date" | "created";
type StatusFilter = "all" | "want" | "visited";

export function TripDetailClient({
  tripId,
  locations,
  members,
  currentMemberId,
  expenses,
  settlements,
}: {
  tripId: string;
  locations: Location[];
  members: Member[];
  currentMemberId: string;
  expenses: Expense[];
  settlements: Settlement[];
}) {
  const [tab, setTab] = useState<"map" | "list" | "expenses">("list");
  const [cats, setCats] = useState<Set<Category>>(new Set());
  const [statusF, setStatusF] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortKey>("manual");

  const visitedCount = locations.filter((l) => l.status === "visited").length;

  const toggleCat = (c: Category) => {
    setCats((prev) => {
      const n = new Set(prev);
      if (n.has(c)) n.delete(c);
      else n.add(c);
      return n;
    });
  };

  const filteredSorted = useMemo(() => {
    let out = locations;
    if (cats.size > 0) {
      out = out.filter((l) => cats.has(l.category));
    }
    if (statusF !== "all") {
      out = out.filter((l) => l.status === statusF);
    }
    const sorted = [...out];
    switch (sort) {
      case "rating":
        sorted.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));
        break;
      case "visit_date":
        sorted.sort((a, b) => {
          const da = a.visit_date ?? "";
          const db = b.visit_date ?? "";
          if (!da && !db) return 0;
          if (!da) return 1;
          if (!db) return -1;
          return db.localeCompare(da); // newest first
        });
        break;
      case "created":
        sorted.sort((a, b) =>
          (b.created_at ?? "").localeCompare(a.created_at ?? "")
        );
        break;
      case "manual":
      default:
        sorted.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
        break;
    }
    return sorted;
  }, [locations, cats, statusF, sort]);

  const manualMode = sort === "manual" && cats.size === 0 && statusF === "all";

  return (
    <>
      <div className="max-w-3xl w-full mx-auto px-4 pt-4 pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex gap-1.5 flex-wrap">
            <TabBtn active={tab === "list"} onClick={() => setTab("list")}>
              <List size={14} strokeWidth={2} /> liste
            </TabBtn>
            <TabBtn active={tab === "map"} onClick={() => setTab("map")}>
              <MapIcon size={14} strokeWidth={2} /> harita
            </TabBtn>
            <TabBtn
              active={tab === "expenses"}
              onClick={() => setTab("expenses")}
            >
              <Wallet size={14} strokeWidth={2} /> hesap
            </TabBtn>
          </div>
          {tab !== "expenses" && <ImportKmlButton tripId={tripId} />}
        </div>
        {tab !== "expenses" && locations.length > 0 && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className="pill pill-mint">
              <span style={{ fontWeight: 700 }}>{locations.length}</span> yer
            </span>
            <span className="pill pill-pink">
              <span style={{ fontWeight: 700 }}>{visitedCount}</span> gittik
            </span>
            <span className="pill pill-lavender">
              <span style={{ fontWeight: 700 }}>
                {locations.reduce((acc, l) => acc + l.loved_by.length, 0)}
              </span>{" "}
              ♡
            </span>
          </div>
        )}

        {tab === "list" && locations.length > 0 && (
          <FilterSortBar
            cats={cats}
            toggleCat={toggleCat}
            statusF={statusF}
            setStatusF={setStatusF}
            sort={sort}
            setSort={setSort}
          />
        )}
      </div>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 pb-32">
        {tab === "map" ? (
          <div
            className="overflow-hidden"
            style={{
              height: "72vh",
              borderRadius: "20px",
              border: "2px solid var(--ink)",
              boxShadow: "var(--shadow-pop)",
            }}
          >
            <MapView locations={locations} members={members} />
          </div>
        ) : tab === "expenses" ? (
          <ExpensesTab
            tripId={tripId}
            members={members}
            currentMemberId={currentMemberId}
            locations={locations}
            expenses={expenses}
            settlements={settlements}
          />
        ) : (
          <LocationList
            locations={filteredSorted}
            members={members}
            currentMemberId={currentMemberId}
            tripId={tripId}
            draggable={manualMode}
          />
        )}
      </main>

      {tab !== "expenses" && <AddLocationButton tripId={tripId} />}
    </>
  );
}

function TabBtn({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="btn-chip"
      style={{
        background: active ? "var(--accent-2)" : "var(--surface)",
        fontWeight: active ? 600 : 500,
      }}
    >
      {children}
    </button>
  );
}

function FilterSortBar({
  cats,
  toggleCat,
  statusF,
  setStatusF,
  sort,
  setSort,
}: {
  cats: Set<Category>;
  toggleCat: (c: Category) => void;
  statusF: StatusFilter;
  setStatusF: (s: StatusFilter) => void;
  sort: SortKey;
  setSort: (s: SortKey) => void;
}) {
  return (
    <div className="mt-3 flex flex-col gap-2">
      <div className="flex gap-1.5 overflow-x-auto -mx-4 px-4 pb-1">
        {CATEGORIES.map((c) => {
          const on = cats.has(c.key as Category);
          return (
            <button
              key={c.key}
              onClick={() => toggleCat(c.key as Category)}
              className="btn-chip flex-shrink-0"
              style={{
                background: on ? "var(--accent-2)" : "var(--surface)",
                fontWeight: on ? 600 : 500,
              }}
            >
              <span>{c.emoji}</span>
              <span>{c.label.toLowerCase()}</span>
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <div className="inline-flex gap-1">
          <StatusBtn active={statusF === "all"} onClick={() => setStatusF("all")}>
            hepsi
          </StatusBtn>
          <StatusBtn
            active={statusF === "visited"}
            onClick={() => setStatusF("visited")}
          >
            gittik
          </StatusBtn>
          <StatusBtn
            active={statusF === "want"}
            onClick={() => setStatusF("want")}
          >
            gidilecek
          </StatusBtn>
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="field-select ml-auto"
          style={{ padding: "0.5rem 2rem 0.5rem 0.85rem", fontSize: "0.92rem", width: "auto" }}
        >
          <option value="manual">elle sıra</option>
          <option value="rating">puana göre</option>
          <option value="visit_date">tarihe göre</option>
          <option value="created">en yeni</option>
        </select>
      </div>
    </div>
  );
}

function StatusBtn({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="btn-chip"
      style={{
        background: active ? "var(--accent-3)" : "var(--surface)",
        fontWeight: active ? 600 : 500,
      }}
    >
      {children}
    </button>
  );
}
