"use client";

import { useState, useCallback } from "react";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getDataTypeConfig } from "@/lib/import/constants";
import type {
    DataTypeKey,
    DataTypeConfig,
    ValidationResult,
    FkValidationResult,
} from "@/lib/import/types";
import { StepSelectType } from "./step-select-type";
import { StepUpload } from "./step-upload";
import { StepPreview } from "./step-preview";
import { StepImport } from "./step-import";

type WizardStep = 1 | 2 | 3 | 4;

const STEP_LABELS = [
    "Select Type",
    "Upload File",
    "Preview & Validate",
    "Import",
];

export function ImportWizard() {
    const [currentStep, setCurrentStep] = useState<WizardStep>(1);
    const [dataType, setDataType] = useState<DataTypeKey | null>(null);
    const [config, setConfig] = useState<DataTypeConfig | null>(null);
    const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
    const [validationResult, setValidationResult] =
        useState<ValidationResult | null>(null);
    const [fkValidationResult, setFkValidationResult] =
        useState<FkValidationResult | null>(null);

    const handleSelectType = useCallback((key: DataTypeKey) => {
        const cfg = getDataTypeConfig(key);
        if (cfg) {
            setDataType(key);
            setConfig(cfg);
            setCurrentStep(2);
        }
    }, []);

    const handleParsed = useCallback(
        (data: Record<string, string>[]) => {
            setParsedRows(data);
            setCurrentStep(3);
        },
        []
    );

    const handleValidationComplete = useCallback(
        (
            validation: ValidationResult,
            fkValidation: FkValidationResult | null
        ) => {
            setValidationResult(validation);
            setFkValidationResult(fkValidation);
        },
        []
    );

    const canProceedToImport =
        validationResult &&
        validationResult.errorRows === 0 &&
        (!fkValidationResult || fkValidationResult.valid);

    const handleReset = useCallback(() => {
        setCurrentStep(1);
        setDataType(null);
        setConfig(null);
        setParsedRows([]);
        setValidationResult(null);
        setFkValidationResult(null);
    }, []);

    const handleBack = useCallback(() => {
        if (currentStep === 2) {
            setCurrentStep(1);
            setDataType(null);
            setConfig(null);
            setParsedRows([]);
        } else if (currentStep === 3) {
            setCurrentStep(2);
            setParsedRows([]);
            setValidationResult(null);
            setFkValidationResult(null);
        } else if (currentStep === 4) {
            setCurrentStep(3);
        }
    }, [currentStep]);

    return (
        <div className="space-y-6">
            {/* Step indicator */}
            <div className="flex items-center gap-2">
                {STEP_LABELS.map((label, i) => {
                    const step = (i + 1) as WizardStep;
                    const isActive = step === currentStep;
                    const isCompleted = step < currentStep;
                    return (
                        <div key={label} className="flex items-center gap-2">
                            {i > 0 && (
                                <div
                                    className={`h-px w-8 ${
                                        isCompleted
                                            ? "bg-primary"
                                            : "bg-border"
                                    }`}
                                />
                            )}
                            <div className="flex items-center gap-1.5">
                                <div
                                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                                        isActive
                                            ? "bg-primary text-primary-foreground"
                                            : isCompleted
                                              ? "bg-primary/20 text-primary"
                                              : "bg-muted text-muted-foreground"
                                    }`}
                                >
                                    {isCompleted ? (
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                    ) : (
                                        step
                                    )}
                                </div>
                                <span
                                    className={`hidden text-xs sm:inline ${
                                        isActive
                                            ? "font-medium text-foreground"
                                            : "text-muted-foreground"
                                    }`}
                                >
                                    {label}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Step content */}
            {currentStep === 1 && (
                <StepSelectType onSelect={handleSelectType} />
            )}

            {currentStep === 2 && config && (
                <StepUpload config={config} onParsed={handleParsed} />
            )}

            {currentStep === 3 && config && dataType && (
                <StepPreview
                    config={config}
                    dataType={dataType}
                    rows={parsedRows}
                    onValidationComplete={handleValidationComplete}
                />
            )}

            {currentStep === 4 && config && dataType && (
                <StepImport
                    config={config}
                    dataType={dataType}
                    rows={parsedRows}
                    onReset={handleReset}
                />
            )}

            {/* Navigation */}
            {currentStep > 1 && currentStep < 4 && (
                <div className="flex items-center justify-between border-t pt-4">
                    <Button
                        variant="ghost"
                        onClick={handleBack}
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                    </Button>

                    {currentStep === 3 && (
                        <Button
                            onClick={() => setCurrentStep(4)}
                            disabled={!canProceedToImport}
                        >
                            {canProceedToImport
                                ? "Proceed to Import"
                                : "Fix errors to continue"}
                        </Button>
                    )}
                </div>
            )}

            {currentStep === 4 && (
                <div className="flex items-center justify-start border-t pt-4">
                    <Button
                        variant="ghost"
                        onClick={handleBack}
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Preview
                    </Button>
                </div>
            )}
        </div>
    );
}
