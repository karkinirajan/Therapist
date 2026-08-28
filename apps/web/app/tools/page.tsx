"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { newId, useRecoveryData } from "@/lib/storage";
import { DISTORTIONS, FRAMEWORK } from "@/lib/constants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export default function ToolsPage() {
  const { data, update, ready } = useRecoveryData();
  const [newItem, setNewItem] = useState("");
  const [newSuds, setNewSuds] = useState("50");

  if (!ready) return null;

  const hierarchy = [...data.hierarchy].sort((a, b) => a.suds - b.suds);
  const savedWork = [...data.logs]
    .filter((l) => l.toolData && (l.toolData.tool === "thought-record" || l.toolData.tool === "behavioral-experiment"))
    .sort((a, b) => b.date.localeCompare(a.date));

  function addHierarchyItem() {
    if (!newItem.trim()) return;
    update((d) => ({
      ...d,
      hierarchy: [
        ...d.hierarchy,
        { id: newId(), label: newItem.trim(), suds: Number(newSuds) || 0, climbed: false },
      ],
    }));
    setNewItem("");
    setNewSuds("50");
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">CBT Tools &amp; Guidelines</h1>
        <p className="text-base leading-relaxed text-muted-foreground">
          The techniques applied in every check-in, plus the running tools that support them.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Framework</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {FRAMEWORK.map((f) => (
            <Card key={f.id}>
              <CardHeader>
                <CardTitle className="text-sm">{f.name}</CardTitle>
                <CardDescription>{f.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Cognitive distortions</h2>
        <p className="text-sm text-muted-foreground">
          Named explicitly in every thought record — not paraphrased around.
        </p>
        <Card>
          <CardContent className="p-2">
            <Accordion>
              {DISTORTIONS.map((d) => (
                <AccordionItem key={d.id} value={d.id} className="px-4">
                  <AccordionTrigger>{d.name}</AccordionTrigger>
                  <AccordionPanel>
                    <AccordionContent className="space-y-1">
                      <p>{d.definition}</p>
                      <p className="italic text-muted-foreground/80">{d.example}</p>
                    </AccordionContent>
                  </AccordionPanel>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Exposure hierarchy</h2>
        <p className="text-sm text-muted-foreground">
          Build the avoidance ladder here; climb one rung at a time in check-ins, small steps
          rather than leaps.
        </p>
        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="flex gap-2">
              <Input
                placeholder="Avoided task or situation"
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
              />
              <Input
                type="number"
                min={0}
                max={100}
                className="w-24"
                value={newSuds}
                onChange={(e) => setNewSuds(e.target.value)}
                aria-label="SUDS 0-100"
              />
              <Button type="button" size="icon" onClick={addHierarchyItem} aria-label="Add">
                <Plus className="size-4" />
              </Button>
            </div>

            {hierarchy.length === 0 && (
              <p className="text-sm text-muted-foreground">No items yet — add the first rung.</p>
            )}

            <div className="space-y-2">
              {hierarchy.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-md border border-border px-3 py-2"
                >
                  <Checkbox
                    checked={item.climbed}
                    onCheckedChange={(checked) =>
                      update((d) => ({
                        ...d,
                        hierarchy: d.hierarchy.map((h) =>
                          h.id === item.id ? { ...h, climbed: checked === true } : h,
                        ),
                      }))
                    }
                  />
                  <span className={`flex-1 text-sm ${item.climbed ? "text-muted-foreground line-through" : "text-foreground"}`}>
                    {item.label}
                  </span>
                  <Badge variant="outline">SUDS {item.suds}</Badge>
                  <button
                    type="button"
                    aria-label="Remove"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() =>
                      update((d) => ({ ...d, hierarchy: d.hierarchy.filter((h) => h.id !== item.id) }))
                    }
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Saved thought records &amp; experiments</h2>
        <p className="text-sm text-muted-foreground">
          Pulled from past check-ins — worth rereading when a similar thought comes up again.
        </p>
        {savedWork.length === 0 ? (
          <p className="text-sm text-muted-foreground">None logged yet.</p>
        ) : (
          <div className="space-y-3">
            {savedWork.map((log) => (
              <Card key={log.id}>
                <CardHeader>
                  <CardTitle className="text-sm">
                    {log.toolData?.tool === "thought-record" ? "Thought Record" : "Behavioral Experiment"}{" "}
                    <span className="font-normal text-muted-foreground">· {formatDate(log.date)}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  {log.toolData?.tool === "thought-record" && (
                    <>
                      <p><strong>Situation:</strong> {log.toolData.situation || "—"}</p>
                      <p><strong>Automatic thought:</strong> {log.toolData.automaticThought || "—"}</p>
                      <p><strong>Distortion:</strong> {log.toolData.distortion || "—"}</p>
                      <p><strong>Balanced thought:</strong> {log.toolData.balancedThought || "—"}</p>
                    </>
                  )}
                  {log.toolData?.tool === "behavioral-experiment" && (
                    <>
                      <p><strong>Belief:</strong> {log.toolData.belief || "—"}</p>
                      <p><strong>Prediction:</strong> {log.toolData.prediction || "—"}</p>
                      <p><strong>Outcome:</strong> {log.toolData.actualOutcome || "—"}</p>
                      <p><strong>What it means:</strong> {log.toolData.whatItMeans || "—"}</p>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
