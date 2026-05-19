import React from 'react';
import { CategorySelect } from '@/lib/common/components/CategorySelect';
import type { Category } from '@/lib/domain/models';

/** Form category field — searchable dropdown with validation support. */
interface CategoryPickerProps {
  label?: string;
  categories: Category[];
  selectedId: string | null;
  onSelect: (categoryId: string) => void;
  loading?: boolean;
  error?: string | null;
  touched?: boolean;
  placeholder?: string;
  onManagePress?: () => void;
  onOpen?: () => void;
}

export function CategoryPicker(props: CategoryPickerProps) {
  return <CategorySelect {...props} />;
}
