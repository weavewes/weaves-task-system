"""Task output model (plain dict-based, managed by service layer)."""
from datetime import datetime
from typing import Optional


class TaskOutput:
    """Represents an output/deliverable attached to a task."""

    VALID_TYPES = frozenset([
        "TEXT", "MARKDOWN", "JSON", "FILE_URL", "FILE_PATH",
        "IMAGE_URL", "DOCUMENT_URL", "SUMMARY", "BRIEF", "REPORT",
    ])

    def __init__(
        self,
        task_id: int,
        output_type: str = "TEXT",
        created_by_member_id: Optional[int] = None,
        title: Optional[str] = None,
        content: Optional[str] = None,
        file_url: Optional[str] = None,
        file_path: Optional[str] = None,
        metadata: Optional[dict] = None,
        id: Optional[int] = None,
        created_at: Optional[datetime] = None,
    ):
        if output_type not in self.VALID_TYPES:
            raise ValueError(f"Invalid output_type: {output_type}")
        self.id = id
        self.task_id = task_id
        self.created_by_member_id = created_by_member_id
        self.output_type = output_type
        self.title = title
        self.content = content
        self.file_url = file_url
        self.file_path = file_path
        self.metadata = metadata or {}
        self.created_at = created_at or datetime.utcnow()

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "task_id": self.task_id,
            "created_by_member_id": self.created_by_member_id,
            "output_type": self.output_type,
            "title": self.title,
            "content": self.content,
            "file_url": self.file_url,
            "file_path": self.file_path,
            "metadata": self.metadata,
            "created_at": self.created_at,
        }

    @classmethod
    def from_row(cls, row) -> "TaskOutput":
        return cls(
            id=row["id"],
            task_id=row["task_id"],
            created_by_member_id=row.get("created_by_member_id"),
            output_type=row["output_type"],
            title=row.get("title"),
            content=row.get("content"),
            file_url=row.get("file_url"),
            file_path=row.get("file_path"),
            metadata=row.get("metadata") or {},
            created_at=row.get("created_at"),
        )