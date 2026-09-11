export function sortEleitoresAlfabeticos<T extends { id?: string; nome?: string | null }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const left = String(a?.nome ?? '').trim().toLocaleLowerCase();
    const right = String(b?.nome ?? '').trim().toLocaleLowerCase();

    if (!left && !right) return 0;
    if (!left) return 1;
    if (!right) return -1;

    return left.localeCompare(right, 'pt-BR');
  });
}
