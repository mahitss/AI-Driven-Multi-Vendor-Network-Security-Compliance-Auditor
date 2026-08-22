"""
Vendor Parsers Registration Package
"""
from app.services.parser.registry import parser_registry
from app.services.parser.vendors.cisco.parser import CiscoParser
from app.services.parser.vendors.juniper.parser import JuniperParser
from app.services.parser.vendors.fortinet.parser import FortinetParser

# Register default deterministic parsers
parser_registry.register(CiscoParser())
parser_registry.register(JuniperParser())
parser_registry.register(FortinetParser())

__all__ = ["CiscoParser", "JuniperParser", "FortinetParser", "parser_registry"]
