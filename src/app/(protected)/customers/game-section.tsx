"use client";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";
import type { GameRow } from "@/lib/customers/types";

interface GameSectionProps {
    games: GameRow[];
}

export function GameSection({ games }: GameSectionProps) {
    return (
        <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Upcoming Games ({games.length})
            </h3>

            {games.length === 0 ? (
                <p className="text-sm text-muted-foreground">No upcoming games.</p>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Wk</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Opponent</TableHead>
                            <TableHead>Venue</TableHead>
                            <TableHead>H/A</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {games.map((game) => (
                            <TableRow key={game.id}>
                                <TableCell className="text-muted-foreground">
                                    {game.week_number}
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-1.5">
                                        <Calendar className="h-3 w-3 text-muted-foreground" />
                                        <span className="text-sm">{game.game_date}</span>
                                        {game.game_time && (
                                            <span className="text-xs text-muted-foreground">
                                                {game.game_time}
                                            </span>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>{game.opponent ?? "TBD"}</TableCell>
                                <TableCell className="text-muted-foreground">
                                    {game.venue_name ?? "TBD"}
                                </TableCell>
                                <TableCell>
                                    <Badge variant={game.is_home_game ? "default" : "outline"} className="text-xs">
                                        {game.is_home_game ? "Home" : "Away"}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
        </div>
    );
}
