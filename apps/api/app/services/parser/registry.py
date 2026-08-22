"""
NetVigil Configuration Parser Registry
Problem Statement: SIH26155 (NTRO)

Decoupled registry managing multi-vendor parser instances and dynamic parser selection.
"""
from typing import Dict, List, Optional
from app.core.errors import NetVigilException
from app.services.parser.base import BaseConfigurationParser
from app.services.parsing.vendor_detector import VendorDetector


class ParserNotFoundError(NetVigilException):
    def __init__(self, vendor: str):
        super().__init__(
            message=f"No registered parser available for vendor '{vendor}'.",
            code="PARSER_NOT_FOUND",
            status_code=422,
            details={"vendor": vendor},
        )


class ParserRegistry:
    """Registry maintaining available vendor parsers and handling dynamic selection."""

    def __init__(self):
        self._parsers: Dict[str, BaseConfigurationParser] = {}

    def register(self, parser: BaseConfigurationParser) -> None:
        """Register a vendor parser implementation."""
        self._parsers[parser.vendor_name.lower()] = parser

    def get_parser_for_vendor(self, vendor: str) -> Optional[BaseConfigurationParser]:
        """Retrieve parser by vendor name."""
        return self._parsers.get(vendor.lower())

    def get_parser(self, content: str, vendor_hint: Optional[str] = None, filename: Optional[str] = None) -> BaseConfigurationParser:
        """
        Dynamically selects the appropriate parser:
        1. If valid vendor_hint provided and registered, returns matching parser.
        2. Otherwise executes deterministic VendorDetector to determine vendor and selects parser.
        3. Raises ParserNotFoundError if no parser is available.
        """
        if vendor_hint and vendor_hint.lower() in self._parsers:
            return self._parsers[vendor_hint.lower()]

        # Run deterministic vendor detection
        detection = VendorDetector.detect(content, filename=filename)
        if detection.vendor != "unknown" and detection.vendor in self._parsers:
            return self._parsers[detection.vendor]

        # Check can_parse across all registered parsers as fallback
        for parser in self._parsers.values():
            if parser.can_parse(content, filename=filename):
                return parser

        raise ParserNotFoundError(vendor=detection.vendor if detection.vendor != "unknown" else "unknown")

    def list_supported_vendors(self) -> List[str]:
        """Returns list of registered vendor keys."""
        return list(self._parsers.keys())


# Global registry singleton
parser_registry = ParserRegistry()
