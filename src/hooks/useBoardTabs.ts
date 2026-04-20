import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useExperimentalFeatures } from "./useExperimentalFeatures";

export type WorkspaceTabKind = "board" | "note" | "draw";

export interface WorkspaceTabTarget {
  kind: WorkspaceTabKind;
  id: string | null;
}

export interface BoardTabItem {
  id: string;
  target: WorkspaceTabTarget;
}

interface BoardTabsState {
  tabs: BoardTabItem[];
  activeTabId: string | null;
  isPinnedOpen: boolean;
}

const BOARD_TABS_STORAGE_KEY = "flowboard.boardTabs";
const BOARD_TABS_EVENT = "flowboard:board-tabs";
const MAX_OPEN_BOARD_TABS = 8;

const DEFAULT_BOARD_TABS_STATE: BoardTabsState = {
  tabs: [],
  activeTabId: null,
  isPinnedOpen: false,
};

function createTabId() {
  return `tab-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildPath(target: WorkspaceTabTarget) {
  if (!target.id) {
    return "/";
  }

  if (target.kind === "board") {
    return `/board/${target.id}`;
  }

  if (target.kind === "note") {
    return `/notes/${target.id}`;
  }

  return `/draw/${target.id}`;
}

function sanitizeState(rawState: Partial<BoardTabsState> | null | undefined): BoardTabsState {
  const rawTabs = Array.isArray(rawState?.tabs) ? rawState.tabs : [];
  const tabs = rawTabs
    .map((tab) => {
      if (!tab || typeof tab !== "object" || typeof tab.id !== "string") {
        return null;
      }

      const rawTarget =
        tab.target && typeof tab.target === "object"
          ? (tab.target as Partial<WorkspaceTabTarget>)
          : null;
      const kind: WorkspaceTabKind =
        rawTarget?.kind === "note" || rawTarget?.kind === "draw" ? rawTarget.kind : "board";
      const id = typeof rawTarget?.id === "string" && rawTarget.id.length > 0 ? rawTarget.id : null;

      return {
        id: tab.id,
        target: {
          kind,
          id,
        },
      } satisfies BoardTabItem;
    })
    .filter((tab): tab is BoardTabItem => !!tab)
    .slice(-MAX_OPEN_BOARD_TABS);

  const activeTabId =
    typeof rawState?.activeTabId === "string" &&
    tabs.some((tab) => tab.id === rawState.activeTabId)
      ? rawState.activeTabId
      : tabs.at(-1)?.id ?? null;

  return {
    tabs,
    activeTabId,
    isPinnedOpen: rawState?.isPinnedOpen === true,
  };
}

function readBoardTabsState(): BoardTabsState {
  if (typeof window === "undefined") {
    return DEFAULT_BOARD_TABS_STATE;
  }

  const raw = window.localStorage.getItem(BOARD_TABS_STORAGE_KEY);
  if (!raw) {
    return DEFAULT_BOARD_TABS_STATE;
  }

  try {
    return sanitizeState(JSON.parse(raw) as Partial<BoardTabsState>);
  } catch {
    return DEFAULT_BOARD_TABS_STATE;
  }
}

function writeBoardTabsState(nextState: BoardTabsState) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(BOARD_TABS_STORAGE_KEY, JSON.stringify(nextState));
  window.dispatchEvent(
    new CustomEvent<BoardTabsState>(BOARD_TABS_EVENT, {
      detail: nextState,
    }),
  );
}

export function useBoardTabs() {
  const navigate = useNavigate();
  const { features } = useExperimentalFeatures();
  const [state, setState] = useState<BoardTabsState>(() => readBoardTabsState());

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === BOARD_TABS_STORAGE_KEY) {
        setState(readBoardTabsState());
      }
    };

    const handleCustomEvent = (event: Event) => {
      const customEvent = event as CustomEvent<BoardTabsState>;
      setState(sanitizeState(customEvent.detail));
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(BOARD_TABS_EVENT, handleCustomEvent);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(BOARD_TABS_EVENT, handleCustomEvent);
    };
  }, []);

  const updateState = useCallback((
    updater: (current: BoardTabsState) => BoardTabsState,
  ) => {
    setState((current) => {
      const nextState = sanitizeState(updater(current));
      writeBoardTabsState(nextState);
      return nextState;
    });
  }, []);

  const activeTab = useMemo(
    () => state.tabs.find((tab) => tab.id === state.activeTabId) ?? null,
    [state.activeTabId, state.tabs],
  );

  const setPinnedOpen = useCallback((isPinnedOpen: boolean) => {
    updateState((current) => ({
      ...current,
      isPinnedOpen,
    }));
  }, [updateState]);

  const createEmptyTab = useCallback(() => {
    if (!features.multiBoardTabs) {
      navigate("/");
      return;
    }

    updateState((current) => {
      const nextTab = {
        id: createTabId(),
        target: {
          kind: "board",
          id: null,
        },
      } satisfies BoardTabItem;

      return {
        tabs: [...current.tabs, nextTab].slice(-MAX_OPEN_BOARD_TABS),
        activeTabId: nextTab.id,
        isPinnedOpen: true,
      };
    });

    navigate("/");
  }, [features.multiBoardTabs, navigate, updateState]);

  const openInNewTab = useCallback((target: WorkspaceTabTarget) => {
    if (!features.multiBoardTabs) {
      navigate(buildPath(target));
      return;
    }

    updateState((current) => {
      const nextTab = {
        id: createTabId(),
        target,
      } satisfies BoardTabItem;

      return {
        tabs: [...current.tabs, nextTab].slice(-MAX_OPEN_BOARD_TABS),
        activeTabId: nextTab.id,
        isPinnedOpen: true,
      };
    });

    navigate(buildPath(target));
  }, [features.multiBoardTabs, navigate, updateState]);

  const openInActiveTab = useCallback((target: WorkspaceTabTarget) => {
    if (!features.multiBoardTabs) {
      navigate(buildPath(target));
      return;
    }

    updateState((current) => {
      const hasActiveTab =
        current.activeTabId !== null &&
        current.tabs.some((tab) => tab.id === current.activeTabId);

      if (!hasActiveTab) {
        const nextTab = {
          id: createTabId(),
          target,
        } satisfies BoardTabItem;

        return {
          tabs: [...current.tabs, nextTab].slice(-MAX_OPEN_BOARD_TABS),
          activeTabId: nextTab.id,
          isPinnedOpen: true,
        };
      }

      return {
        ...current,
        tabs: current.tabs.map((tab) =>
          tab.id === current.activeTabId ? { ...tab, target } : tab,
        ),
        isPinnedOpen: true,
      };
    });

    navigate(buildPath(target));
  }, [features.multiBoardTabs, navigate, updateState]);

  const ensureInActiveTab = useCallback((target: WorkspaceTabTarget) => {
    if (!features.multiBoardTabs) {
      return;
    }

    updateState((current) => {
      const hasActiveTab =
        current.activeTabId !== null &&
        current.tabs.some((tab) => tab.id === current.activeTabId);

      if (!hasActiveTab) {
        const nextTab = {
          id: createTabId(),
          target,
        } satisfies BoardTabItem;

        return {
          tabs: [...current.tabs, nextTab].slice(-MAX_OPEN_BOARD_TABS),
          activeTabId: nextTab.id,
          isPinnedOpen: current.isPinnedOpen,
        };
      }

      const activeTarget = current.tabs.find((tab) => tab.id === current.activeTabId)?.target;
      if (activeTarget?.kind === target.kind && activeTarget.id === target.id) {
        return current;
      }

      return {
        ...current,
        tabs: current.tabs.map((tab) =>
          tab.id === current.activeTabId ? { ...tab, target } : tab,
        ),
      };
    });
  }, [features.multiBoardTabs, updateState]);

  const activateTab = useCallback((tabId: string) => {
    const nextTab = state.tabs.find((tab) => tab.id === tabId);
    if (!nextTab) {
      return;
    }

    updateState((current) => ({
      ...current,
      activeTabId: tabId,
      isPinnedOpen: true,
    }));

    navigate(buildPath(nextTab.target));
  }, [navigate, state.tabs, updateState]);

  const closeTab = useCallback((tabId: string) => {
    const closingIndex = state.tabs.findIndex((tab) => tab.id === tabId);
    if (closingIndex === -1) {
      return;
    }

    const nextTabs = state.tabs.filter((tab) => tab.id !== tabId);
    const nextActiveTab =
      state.activeTabId === tabId
        ? nextTabs[Math.max(0, closingIndex - 1)] ?? nextTabs.at(-1) ?? null
        : state.tabs.find((tab) => tab.id === state.activeTabId) ?? null;

    updateState((current) => ({
      ...current,
      tabs: current.tabs.filter((tab) => tab.id !== tabId),
      activeTabId:
        current.activeTabId === tabId
          ? nextActiveTab?.id ?? null
          : current.activeTabId,
      isPinnedOpen: current.isPinnedOpen || nextTabs.length > 0,
    }));

    if (state.activeTabId !== tabId) {
      return;
    }

    navigate(nextActiveTab ? buildPath(nextActiveTab.target) : "/");
  }, [navigate, state.activeTabId, state.tabs, updateState]);

  const pruneTabs = useCallback((validTargets: Record<WorkspaceTabKind, string[]>) => {
    updateState((current) => {
      const nextTabs = current.tabs.filter(
        (tab) =>
          tab.target.id === null ||
          validTargets[tab.target.kind].includes(tab.target.id),
      );

      if (nextTabs.length === current.tabs.length) {
        return current;
      }

      return {
        ...current,
        tabs: nextTabs,
      };
    });
  }, [updateState]);

  return {
    isEnabled: features.multiBoardTabs,
    tabs: state.tabs,
    activeTabId: state.activeTabId,
    activeTab,
    isPinnedOpen: state.isPinnedOpen,
    setPinnedOpen,
    createEmptyTab,
    openInNewTab,
    openInActiveTab,
    ensureInActiveTab,
    activateTab,
    closeTab,
    pruneTabs,
  };
}
