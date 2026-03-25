"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AddManagerForm } from "@/components/admin/add-manager-form";
import { ChevronDown, ChevronUp } from "lucide-react";

export function AddManagerSection() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section className="mt-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Add New Manager</h2>
        <Button
          onClick={() => setIsOpen(!isOpen)}
          variant="outline"
          className="gap-2"
        >
          {isOpen ? (
            <>
              <ChevronUp className="h-4 w-4" />
              Hide Form
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" />
              Show Form
            </>
          )}
        </Button>
      </div>
      {isOpen && <AddManagerForm />}
    </section>
  );
}
