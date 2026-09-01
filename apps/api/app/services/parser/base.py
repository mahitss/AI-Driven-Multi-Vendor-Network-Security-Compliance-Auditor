"""
NetVigil Base Configuration Parser Interface
Problem Statement: SIH26155 (NTRO)

Defines the contract for multi-vendor deterministic configuration parsers.
"""
from abc import ABC, abstractmethod
from typing import List, Optional, Set
from app.services.parser.models import NormalizedSecurityProfile, UnknownItem


class BaseConfigurationParser(ABC):
    """Abstract base class for vendor-specific deterministic configuration parsers."""

    @property
    @abstractmethod
    def vendor_name(self) -> str:
        """Vendor identifier (e.g., 'cisco', 'juniper', 'fortinet')."""
        pass

    @property
    @abstractmethod
    def parser_name(self) -> str:
        """Name of the parser implementation."""
        pass

    @property
    @abstractmethod
    def parser_version(self) -> str:
        """Semantic version of the parser implementation."""
        pass

    @property
    @abstractmethod
    def supported_platforms(self) -> List[str]:
        """List of supported operating systems / platforms (e.g. ['ios', 'ios-xe'])."""
        pass

    @abstractmethod
    def can_parse(self, content: str, filename: Optional[str] = None) -> bool:
        """Evaluates whether this parser can process the provided configuration content."""
        pass

    @abstractmethod
    def parse(self, content: str, filename: Optional[str] = None) -> NormalizedSecurityProfile:
        """
        Parses raw configuration text, extracts security facts with source line evidence,
        identifies unknown directives, and returns a validated NormalizedSecurityProfile.
        """
        pass


class ParseTracker:
    """Helper utility for tracking parsed vs unparsed lines to accurately build UnknownItems."""

    def __init__(self, raw_content: str):
        self.lines = raw_content.splitlines()
        self.total_lines = len(self.lines)
        self.matched_line_indices: Set[int] = set()

    def mark_matched(self, line_number: int):
        """Mark a 1-indexed line number as parsed."""
        if 1 <= line_number <= self.total_lines:
            self.matched_line_indices.add(line_number - 1)

    def mark_range_matched(self, start_line: int, end_line: int):
        """Mark a range of 1-indexed line numbers as parsed."""
        for ln in range(start_line, end_line + 1):
            self.mark_matched(ln)

    def get_unmatched_items(self, vendor: str, ignore_patterns: Optional[List[str]] = None) -> List[UnknownItem]:
        """Extract unknown/unparsed directives ignoring empty lines and comments."""
        unknowns: List[UnknownItem] = []
        for idx, line in enumerate(self.lines):
            if idx in self.matched_line_indices:
                continue

            stripped = line.strip()
            # Ignore empty lines, standard comment delimiters, and end markers
            if not stripped:
                continue
            if stripped.startswith("!") or stripped.startswith("#") or stripped == "end" or stripped == "exit":
                continue

            unknowns.append(
                UnknownItem(
                    raw_text=stripped[:500],
                    line_number=idx + 1,
                    vendor=vendor,
                    category="unrecognized_syntax",
                    confidence=0.0,
                    status="unrecognized",
                )
            )
            # Bound detailed unmatched items to prevent JSON serialization bloat
            if len(unknowns) >= 1000:
                break

        return unknowns
