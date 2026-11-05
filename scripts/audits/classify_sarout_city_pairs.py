#!/usr/bin/env python3
"""Classify Sarout bilingual city labels conservatively; no automatic record merge."""
from collections import Counter

# Reviewed *candidate* translation labels, not an authoritative geographic registry.
TRANSLATION_CANDIDATES = {
    frozenset(("Casablanca", "الدار البيضاء")),
    frozenset(("Marrakech", "مراكش")),
    frozenset(("Tanger", "طنجة")),
    frozenset(("Rabat", "الرباط")),
    frozenset(("Agadir", "أكادير")),
    frozenset(("El Jadida", "الجديدة")),
    frozenset(("Oujda", "وجدة")),
    frozenset(("Essaouira", "الصويرة")),
    frozenset(("Nador", "الناظور")),
    frozenset(("El Mansouria", "المنصورية")),
    frozenset(("Asilah", "أصيلة")),
    frozenset(("Sidi Kacem", "سيدي قاسم")),
    frozenset(("Témara", "تمارة")),
    frozenset(("Bouznika", "بوزنيقة")),
    frozenset(("Taza", "تازة")),
    frozenset(("Khouribga", "خريبكة")),
    frozenset(("Béni Mellal", "بني ملال")),
    frozenset(("Dakhla", "الداخلة")),
}
# Never silently normalize district/suburb and city as equivalent.
GEOGRAPHIC_REVIEW = {
    frozenset(("Martil", "تطوان")),
    frozenset(("Bouskoura", "الدار البيضاء")),
    frozenset(("Dar Bouazza", "الدار البيضاء")),
    frozenset(("Tiznit", "أكادير")),
    frozenset(("Skhirat", "الرباط")),
    frozenset(("Settat", "الدار البيضاء")),
}


def classify_city_pair(left, right):
    if not left or not right:
        return "missing"
    if left == right:
        return "same_string"
    pair = frozenset((left.strip(), right.strip()))
    if pair in GEOGRAPHIC_REVIEW:
        return "geographic_review"
    if pair in TRANSLATION_CANDIDATES:
        return "translation_candidate"
    return "unmapped_review"


def summarize_pairs(rows):
    """Accept iterable of (left_city,right_city,count); return counts only."""
    result = Counter()
    for left, right, count in rows:
        if not isinstance(count, int) or count < 0:
            raise ValueError("Counts must be nonnegative integers")
        result[classify_city_pair(left, right)] += count
    return dict(sorted(result.items()))
