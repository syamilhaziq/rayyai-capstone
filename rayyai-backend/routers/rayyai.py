from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import date, timedelta

import models
import schemas
from database import get_db
from routers.utils import get_current_user

router = APIRouter()