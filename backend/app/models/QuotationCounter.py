from sqlalchemy import Column, String, Integer
from app.db.session import Base

class QuotationCounter(Base):
    __tablename__ = "quotation_counters"

    # Composite primary key ensures a unique row per person per financial year
    person_prefix = Column(String(10), primary_key=True, nullable=False)
    financial_year = Column(String(10), primary_key=True, nullable=False)
    
    # Keeps track of the running sequence
    current_count = Column(Integer, default=0, nullable=False)