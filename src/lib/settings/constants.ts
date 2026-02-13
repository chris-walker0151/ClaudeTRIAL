import type { OptimizerSetting } from "./types";

export const SETTINGS_TABS = [
    { value: "routes", label: "Preferred Routes" },
    { value: "optimizer", label: "Optimizer Settings" },
    { value: "hubs", label: "Hub Configuration" },
] as const;

export const DEFAULT_OPTIMIZER_SETTINGS: OptimizerSetting[] = [
    { key: "setup_buffer_hrs", value: 4, label: "Setup Buffer (hours)", description: "Hours before game time that equipment must be on-site" },
    { key: "teardown_buffer_hrs", value: 3, label: "Teardown Buffer (hours)", description: "Hours after game for equipment teardown" },
    { key: "max_drive_hrs_per_day", value: 11, label: "Max Drive Hours/Day", description: "DOT-compliant maximum driving hours per personnel per day" },
    { key: "max_stops_per_trip", value: 4, label: "Max Stops/Trip", description: "Maximum venue stops per single trip" },
    { key: "solver_timeout_ms", value: 30000, label: "Solver Timeout (ms)", description: "Maximum solver computation time in milliseconds" },
    { key: "max_cluster_radius_miles", value: 150, label: "Max Cluster Radius (miles)", description: "Maximum radius for grouping nearby venues" },
];
