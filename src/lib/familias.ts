export function sortFamiliasPorNome<T extends { id: string; nome?: string | null }>(items: T[]): T[] {
  return [...items].sort((current, next) => {
    const left = (current.nome?.trim() || current.id).toLocaleLowerCase('pt-BR');
    const right = (next.nome?.trim() || next.id).toLocaleLowerCase('pt-BR');
    return left.localeCompare(right, 'pt-BR');
  });
}

export function groupFamiliaMembrosPorGrau<T extends {
  grauParentesco?: string | null;
  eleitor?: { nome?: string | null } | null;
}>(items: T[]) {
  const groups = new Map<string, T[]>();

  for (const item of items) {
    const grau = (item.grauParentesco ?? '').trim() || 'Sem grau de parentesco';
    const current = groups.get(grau) ?? [];
    current.push(item);
    groups.set(grau, current);
  }

  return Array.from(groups.entries())
    .sort(([left], [right]) => left.localeCompare(right, 'pt-BR'))
    .map(([grau, membros]) => ({ grau, membros }));
}

export function sortEleitoresPorNome<T extends { id: string; nome?: string | null }>(items: T[]): T[] {
  return [...items].sort((current, next) => {
    const left = (current.nome?.trim() || current.id).toLocaleLowerCase('pt-BR');
    const right = (next.nome?.trim() || next.id).toLocaleLowerCase('pt-BR');
    return left.localeCompare(right, 'pt-BR');
  });
}

export function filterEleitoresPorTermo<T extends {
  id: string;
  nome?: string | null;
  cpf?: string | null;
  tituloEleitor?: string | null;
  sessao?: string | null;
  zona?: string | null;
}>(items: T[], termo: string): T[] {
  const normalized = termo.trim().toLowerCase();

  if (!normalized) {
    return [];
  }

  return sortEleitoresPorNome(
    items.filter(item => {
      const values = [item.nome, item.cpf, item.tituloEleitor, item.sessao, item.zona];
      return values.some(value => value?.toString().toLowerCase().includes(normalized));
    })
  );
}

export async function deleteFamiliaWithMembers(prismaClient: any, familiaId: string): Promise<void> {
  await prismaClient.$transaction(async (tx: any) => {
    await tx.familiaMembro.deleteMany({ where: { familiaId } });
    await tx.familia.delete({ where: { id: familiaId } });
  });
}
