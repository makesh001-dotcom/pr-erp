// src/components/SerialNumberModal.jsx

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";

import API from "../api/client";

const SerialNumberModal = ({
  isOpen,
  model,
  onClose,
  onSuccess,
}) => {
  const [serialNumbers, setSerialNumbers] = useState([]);
  const [existingSerials, setExistingSerials] = useState([]);

  const [currentPage, setCurrentPage] = useState(1);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [savedCount, setSavedCount] = useState(0);

  const [error, setError] = useState("");

  const [progress, setProgress] = useState(0);

  const inputRefs = useRef([]);

  // Responsive items per page
  const getItemsPerPage = () => {
    if (window.innerWidth < 640) return 6; // mobile
    if (window.innerWidth < 768) return 8; // tablet
    if (window.innerWidth < 1024) return 12; // small laptop
    return 20; // desktop
  };

  const [itemsPerPage, setItemsPerPage] = useState(getItemsPerPage());

  // Update items per page on resize
  useEffect(() => {
    const handleResize = () => {
      setItemsPerPage(getItemsPerPage());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ============================================================
  // LOAD EXISTING SERIAL NUMBERS
  // ============================================================

  useEffect(() => {
    if (!isOpen || !model) {
      return;
    }

    const loadSerialNumbers = async () => {
      setIsLoading(true);
      setError("");

      try {
        const response = await API.get(
          `/api/v1/inventory/serial-numbers/model/${model.id}`,
          {
            params: {
              status: "IN_STOCK",
              skip: 0,
              limit: 1000,
            },
          }
        );

        const existing =
          response.data?.data || [];

        setExistingSerials(existing);

        const currentStock =
          Math.max(
            0,
            Number(model.current_stock) || 0
          );

        const existingCount =
          existing.length;

        const remainingQuantity =
          Math.max(
            0,
            currentStock - existingCount
          );

        setSerialNumbers(
          Array(remainingQuantity).fill("")
        );

        setCurrentPage(1);
        setSavedCount(0);
        setProgress(0);
      } catch (err) {
        console.error(
          "Failed to load existing serial numbers:",
          err
        );

        setError(
          err.response?.data?.detail ||
            "Failed to load existing serial numbers."
        );

        setSerialNumbers([]);
        setExistingSerials([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadSerialNumbers();
  }, [isOpen, model]);

  // ============================================================
  // AUTO FOCUS FIRST INPUT
  // ============================================================

  useEffect(() => {
    if (
      isOpen &&
      !isLoading &&
      serialNumbers.length > 0
    ) {
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    }
  }, [
    isOpen,
    isLoading,
    serialNumbers.length,
  ]);

  // ============================================================
  // HANDLE SERIAL NUMBER CHANGE
  // ============================================================

  const handleSerialChange = (
    index,
    value
  ) => {
    const updated = [
      ...serialNumbers,
    ];

    updated[index] =
      value.toUpperCase().trim();

    setSerialNumbers(updated);

    setError("");
  };

  // ============================================================
  // CHECK DUPLICATES
  // ============================================================

  const getDuplicates = () => {
    const filled =
      serialNumbers.filter(
        (serial) =>
          serial.trim() !== ""
      );

    const duplicates =
      filled.filter(
        (serial, index) =>
          filled.indexOf(serial) !==
          index
      );

    return [
      ...new Set(duplicates),
    ];
  };

  // ============================================================
  // CHECK AGAINST EXISTING DATABASE SERIALS
  // ============================================================

  const getExistingDuplicates = () => {
    const existingSet =
      new Set(
        existingSerials.map(
          (item) =>
            item.serial_number
              ?.trim()
              .toUpperCase()
        )
      );

    return serialNumbers.filter(
      (serial) =>
        serial &&
        existingSet.has(
          serial.trim().toUpperCase()
        )
    );
  };

  // ============================================================
  // ENTER KEY
  // ============================================================

  const handleKeyDown = (
    index,
    e
  ) => {
    if (e.key !== "Enter") {
      return;
    }

    e.preventDefault();

    const globalIndex =
      (currentPage - 1) *
        itemsPerPage +
      index;

    const nextIndex =
      globalIndex + 1;

    if (
      nextIndex <
      serialNumbers.length
    ) {
      inputRefs.current[
        nextIndex
      ]?.focus();
    } else {
      handleSave();
    }
  };

  // ============================================================
  // BARCODE SCANNER SUPPORT
  // ============================================================

  const handleBarcodeScan =
    useCallback(
      (e) => {
        if (e.key !== "Enter") {
          return;
        }

        const activeElement =
          document.activeElement;

        if (
          activeElement &&
          activeElement.tagName ===
            "INPUT"
        ) {
          const index = parseInt(
            activeElement.dataset.index,
            10
          );

          if (
            !isNaN(index) &&
            serialNumbers[index]
          ) {
            const nextIndex =
              index + 1;

            if (
              nextIndex <
              serialNumbers.length
            ) {
              inputRefs.current[
                nextIndex
              ]?.focus();
            }
          }
        }
      },
      [serialNumbers]
    );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    document.addEventListener(
      "keydown",
      handleBarcodeScan
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleBarcodeScan
      );
    };
  }, [
    isOpen,
    handleBarcodeScan,
  ]);

  // ============================================================
  // PAGINATION
  // ============================================================

  const totalPages =
    Math.ceil(
      serialNumbers.length /
        itemsPerPage
    );

  const getCurrentPageItems =
    () => {
      const start =
        (currentPage - 1) *
        itemsPerPage;

      const end = Math.min(
        start + itemsPerPage,
        serialNumbers.length
      );

      return serialNumbers.slice(
        start,
        end
      );
    };

  // ============================================================
  // SAVE SERIAL NUMBERS
  // ============================================================

  const handleSave = async () => {
    if (isSaving) {
      return;
    }

    const filled =
      serialNumbers.filter(
        (serial) =>
          serial.trim() !== ""
      );

    const emptyCount =
      serialNumbers.length -
      filled.length;

    if (filled.length === 0) {
      setError(
        "Please enter at least one serial number."
      );

      return;
    }

    const duplicates =
      getDuplicates();

    if (duplicates.length > 0) {
      setError(
        `Duplicate serial numbers found: ${duplicates.join(
          ", "
        )}`
      );

      return;
    }

    const existingDuplicates =
      getExistingDuplicates();

    if (
      existingDuplicates.length > 0
    ) {
      setError(
        `These serial numbers already exist: ${existingDuplicates.join(
          ", "
        )}`
      );

      return;
    }

    setIsSaving(true);
    setError("");
    setProgress(0);
    setSavedCount(0);

    try {
      const chunkSize = 100;

      const chunks = [];

      for (
        let i = 0;
        i < filled.length;
        i += chunkSize
      ) {
        chunks.push(
          filled.slice(
            i,
            i + chunkSize
          )
        );
      }

      let totalSaved = 0;

      for (
        let i = 0;
        i < chunks.length;
        i++
      ) {
        const response =
          await API.post(
            "/api/v1/inventory/serial-numbers/bulk",
            {
              model_id:
                model.id,

              serial_numbers:
                chunks[i],

              total_quantity:
                serialNumbers.length,

              sku:
                model.sku || null,

              model_no:
                model.model_no,
            }
          );

        const saved =
          response.data
            ?.saved_count || 0;

        totalSaved += saved;

        setSavedCount(
          totalSaved
        );

        setProgress(
          ((i + 1) /
            chunks.length) *
            100
        );

        if (
          response.data
            ?.duplicates
            ?.length > 0
        ) {
          setError(
            `Duplicate serial numbers found: ${response.data.duplicates.join(
              ", "
            )}`
          );

          setIsSaving(false);

          return;
        }
      }

      onSuccess?.(
        model.model_no,
        totalSaved
      );

      onClose();

      if (emptyCount > 0) {
        alert(
          `Successfully saved ${totalSaved} serial numbers.\n\n${emptyCount} input(s) were left empty.`
        );
      }
    } catch (err) {
      console.error(
        "Serial number save error:",
        err
      );

      setError(
        err.response?.data
          ?.detail ||
          "Failed to save serial numbers."
      );
    } finally {
      setIsSaving(false);
    }
  };

  // ============================================================
  // CLOSE / RESET
  // ============================================================

  const handleClose = () => {
    if (isSaving) {
      return;
    }

    setSerialNumbers([]);
    setExistingSerials([]);
    setCurrentPage(1);
    setSavedCount(0);
    setProgress(0);
    setError("");

    onClose();
  };

  // ============================================================
  // RENDER
  // ============================================================

  if (
    !isOpen ||
    !model
  ) {
    return null;
  }

  const currentItems =
    getCurrentPageItems();

  const totalQuantity =
    serialNumbers.length;

  const filledCount =
    serialNumbers.filter(
      (serial) =>
        serial.trim() !== ""
    ).length;

  const currentStock =
    Math.max(
      0,
      Number(model.current_stock) ||
        0
    );

  const existingCount =
    existingSerials.length;

  const allSerialsAssigned =
    currentStock > 0 &&
    existingCount >=
      currentStock;

  // Get grid columns based on screen size
  const getGridCols = () => {
    if (window.innerWidth < 640) return "grid-cols-2";
    if (window.innerWidth < 768) return "grid-cols-3";
    if (window.innerWidth < 1024) return "grid-cols-4";
    return "grid-cols-5";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] flex flex-col">

        {/* ================================================== */}
        {/* HEADER */}
        {/* ================================================== */}

        <div className="p-4 sm:p-6 border-b border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
          <div className="w-full sm:w-auto">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">
              Serial Numbers for{" "}
              {model.model_no}
            </h2>

            <div className="text-xs sm:text-sm text-gray-500 mt-1 space-y-0.5 sm:space-y-1">
              <p>
                Current Stock:{" "}
                <span className="font-bold text-gray-800">
                  {currentStock}
                </span>
              </p>

              <p>
                Existing Serial Numbers:{" "}
                <span className="font-bold text-blue-600">
                  {existingCount}
                </span>
              </p>

              <p>
                Remaining to Assign:{" "}
                <span className="font-bold text-green-600">
                  {Math.max(
                    0,
                    currentStock -
                      existingCount
                  )}
                </span>
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 text-2xl sm:text-3xl self-end sm:self-auto"
            disabled={isSaving}
          >
            ×
          </button>
        </div>

        {/* ================================================== */}
        {/* LOADING */}
        {/* ================================================== */}

        {isLoading && (
          <div className="p-8 sm:p-10 text-center">
            <div className="text-2xl sm:text-3xl mb-3">
              ⏳
            </div>

            <p className="text-xs sm:text-sm text-gray-600">
              Checking existing serial numbers...
            </p>
          </div>
        )}

        {/* ================================================== */}
        {/* ALL SERIALS ALREADY ASSIGNED */}
        {/* ================================================== */}

        {!isLoading &&
          allSerialsAssigned && (
            <div className="flex-1 flex items-center justify-center p-8 sm:p-10">
              <div className="text-center">
                <div className="text-5xl sm:text-6xl mb-4">
                  ✅
                </div>

                <h3 className="text-lg sm:text-xl font-bold text-green-700">
                  All Serial Numbers Assigned
                </h3>

                <p className="text-xs sm:text-sm text-gray-500 mt-2">
                  This model has{" "}
                  <strong>
                    {existingCount}
                  </strong>{" "}
                  serial numbers assigned
                  to{" "}
                  <strong>
                    {currentStock}
                  </strong>{" "}
                  units of stock.
                </p>

                <button
                  onClick={handleClose}
                  className="mt-6 px-4 sm:px-6 py-2 bg-gray-800 text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-gray-900"
                >
                  Close
                </button>
              </div>
            </div>
          )}

        {/* ================================================== */}
        {/* ERROR */}
        {/* ================================================== */}

        {!isLoading &&
          !allSerialsAssigned &&
          error && (
            <div className="mx-4 sm:mx-6 mt-3 sm:mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs sm:text-sm">
              ❌ {error}
            </div>
          )}

        {/* ================================================== */}
        {/* PROGRESS */}
        {/* ================================================== */}

        {isSaving && (
          <div className="px-4 sm:px-6 py-3 bg-blue-50 border-b border-blue-100">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs sm:text-sm font-medium text-blue-700">
                Saving...{" "}
                {savedCount}/
                {filledCount}
              </span>

              <span className="text-xs sm:text-sm font-medium text-blue-700">
                {Math.round(
                  progress
                )}
                %
              </span>
            </div>

            <div className="w-full bg-blue-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${progress}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* ================================================== */}
        {/* INFO */}
        {/* ================================================== */}

        {!isLoading &&
          !allSerialsAssigned && (
            <div className="mx-4 sm:mx-6 mt-3 sm:mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-xs sm:text-sm text-green-700">
              <p className="font-medium text-xs sm:text-sm">
                📌 Serial Number Entry
              </p>

              <ul className="list-disc list-inside mt-1 text-[10px] sm:text-xs space-y-0.5 sm:space-y-1">
                <li>
                  Only remaining stock requires serial numbers.
                </li>

                <li>
                  Existing serial numbers will not be requested again.
                </li>

                <li>
                  USB barcode scanners are supported.
                </li>

                <li>
                  Press Enter to move to the next field.
                </li>

                <li>
                  Serial numbers must be unique.
                </li>
              </ul>
            </div>
          )}

        {/* ================================================== */}
        {/* SERIAL INPUTS */}
        {/* ================================================== */}

        {!isLoading &&
          !allSerialsAssigned && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <div className={`grid ${getGridCols()} gap-2 sm:gap-3`}>
                {currentItems.map(
                  (
                    serial,
                    index
                  ) => {
                    const globalIndex =
                      (currentPage -
                        1) *
                        itemsPerPage +
                      index;

                    return (
                      <div
                        key={
                          globalIndex
                        }
                        className="flex flex-col"
                      >
                        <label className="text-[10px] sm:text-xs font-medium text-gray-600 mb-0.5 sm:mb-1">
                          #
                          {globalIndex +
                            1}
                        </label>

                        <input
                          ref={(el) =>
                            (inputRefs.current[
                              globalIndex
                            ] = el)
                          }
                          type="text"
                          data-index={
                            globalIndex
                          }
                          value={
                            serial
                          }
                          onChange={(
                            e
                          ) =>
                            handleSerialChange(
                              globalIndex,
                              e.target
                                .value
                            )
                          }
                          onKeyDown={(
                            e
                          ) =>
                            handleKeyDown(
                              index,
                              e
                            )
                          }
                          placeholder="Scan/Enter"
                          className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                          disabled={
                            isSaving
                          }
                          inputMode="text"
                          autoCapitalize="characters"
                          autoCorrect="off"
                          spellCheck="false"
                        />
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          )}

        {/* ================================================== */}
        {/* PAGINATION */}
        {/* ================================================== */}

        {!isLoading &&
          !allSerialsAssigned &&
          totalPages > 1 && (
            <div className="px-4 sm:px-6 py-3 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
              <button
                onClick={() =>
                  setCurrentPage(
                    (p) =>
                      Math.max(
                        1,
                        p - 1
                      )
                  )
                }
                disabled={
                  currentPage ===
                    1 ||
                  isSaving
                }
                className="w-full sm:w-auto px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm border rounded-lg disabled:opacity-30 hover:bg-gray-50"
              >
                ← Previous
              </button>

              <span className="text-xs sm:text-sm text-gray-600">
                Page{" "}
                {currentPage}{" "}
                of{" "}
                {totalPages}
              </span>

              <button
                onClick={() =>
                  setCurrentPage(
                    (p) =>
                      Math.min(
                        totalPages,
                        p + 1
                      )
                  )
                }
                disabled={
                  currentPage ===
                    totalPages ||
                  isSaving
                }
                className="w-full sm:w-auto px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm border rounded-lg disabled:opacity-30 hover:bg-gray-50"
              >
                Next →
              </button>
            </div>
          )}

        {/* ================================================== */}
        {/* FOOTER */}
        {/* ================================================== */}

        {!isLoading &&
          !allSerialsAssigned && (
            <div className="p-4 sm:p-6 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0 bg-gray-50 rounded-b-2xl">
              <div className="text-xs sm:text-sm text-gray-500 text-center sm:text-left">
                <span className="font-medium">
                  {filledCount}
                </span>{" "}
                serial numbers entered

                {filledCount >
                  0 && (
                  <span className="ml-2 text-[10px] sm:text-xs text-green-600">
                    ✓ Ready to save
                  </span>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
                <button
                  onClick={
                    handleClose
                  }
                  className="w-full sm:w-auto px-4 sm:px-6 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                  disabled={
                    isSaving
                  }
                >
                  Cancel
                </button>

                <button
                  onClick={
                    handleSave
                  }
                  disabled={
                    isSaving ||
                    filledCount ===
                      0
                  }
                  className="w-full sm:w-auto px-4 sm:px-6 py-1.5 sm:py-2 text-xs sm:text-sm font-bold text-white bg-green-600 rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <span className="animate-spin">
                        ⏳
                      </span>
                      Saving...
                    </>
                  ) : (
                    "💾 Save"
                  )}
                </button>
              </div>
            </div>
          )}
      </div>
    </div>
  );
};

export default SerialNumberModal;