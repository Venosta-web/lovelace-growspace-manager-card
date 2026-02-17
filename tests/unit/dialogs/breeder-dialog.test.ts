import { describe, it, expect } from 'vitest';

// Test the _getUniqueBreeders logic (extracted for testability)
describe('Breeder aggregation', () => {
  const mockStrains = [
    {
      strain: 'OG Kush',
      phenotype: 'default',
      key: 'og|default',
      breeder: 'Seedsman',
      breeder_logo: '/logo1.webp',
    },
    {
      strain: 'White Widow',
      phenotype: 'default',
      key: 'ww|default',
      breeder: 'Seedsman',
      breeder_logo: '/logo1.webp',
    },
    {
      strain: 'Blue Dream',
      phenotype: 'default',
      key: 'bd|default',
      breeder: 'Humboldt Seeds',
      breeder_logo: '',
    },
    {
      strain: 'Northern Lights',
      phenotype: 'default',
      key: 'nl|default',
      breeder: '',
      breeder_logo: '',
    },
    {
      strain: 'Amnesia Haze',
      phenotype: 'default',
      key: 'ah|default',
    },
  ];

  function getUniqueBreeders(strains: typeof mockStrains) {
    const breederMap = new Map<string, { logo: string; strainCount: number }>();
    strains.forEach((s) => {
      if (s.breeder && s.breeder.trim()) {
        const existing = breederMap.get(s.breeder);
        if (existing) {
          existing.strainCount++;
          if (!existing.logo && s.breeder_logo) {
            existing.logo = s.breeder_logo;
          }
        } else {
          breederMap.set(s.breeder, {
            logo: s.breeder_logo || '',
            strainCount: 1,
          });
        }
      }
    });
    return [...breederMap.entries()]
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  it('should aggregate unique breeders with strain counts', () => {
    const result = getUniqueBreeders(mockStrains);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      name: 'Humboldt Seeds',
      logo: '',
      strainCount: 1,
    });
    expect(result[1]).toEqual({
      name: 'Seedsman',
      logo: '/logo1.webp',
      strainCount: 2,
    });
  });

  it('should exclude strains without breeder', () => {
    const result = getUniqueBreeders(mockStrains);
    const names = result.map((b) => b.name);
    expect(names).not.toContain('');
    expect(names).not.toContain(undefined);
  });

  it('should return empty for no breeders', () => {
    const result = getUniqueBreeders([
      {
        strain: 'Test',
        phenotype: '',
        key: 't|',
        breeder: '',
        breeder_logo: '',
      },
    ]);
    expect(result).toHaveLength(0);
  });

  it('should preserve logo when multiple strains share same breeder', () => {
    const strains = [
      {
        strain: 'Strain A',
        phenotype: 'default',
        key: 'sa|default',
        breeder: 'ABC Breeder',
        breeder_logo: '/abc-logo.webp',
      },
      {
        strain: 'Strain B',
        phenotype: 'default',
        key: 'sb|default',
        breeder: 'ABC Breeder',
        breeder_logo: '',
      },
      {
        strain: 'Strain C',
        phenotype: 'default',
        key: 'sc|default',
        breeder: 'ABC Breeder',
        breeder_logo: '',
      },
    ];

    const result = getUniqueBreeders(strains);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      name: 'ABC Breeder',
      logo: '/abc-logo.webp',
      strainCount: 3,
    });
  });

  it('should handle breeders with leading/trailing spaces as separate entries', () => {
    const strains = [
      {
        strain: 'Strain 1',
        phenotype: 'default',
        key: 's1|default',
        breeder: '  Royal Queen Seeds  ',
        breeder_logo: '/rqs-logo.png',
      },
      {
        strain: 'Strain 2',
        phenotype: 'default',
        key: 's2|default',
        breeder: 'Royal Queen Seeds',
        breeder_logo: '',
      },
    ];

    const result = getUniqueBreeders(strains);
    // Different breeder keys result in separate entries
    // (trim() only validates non-empty, doesn't normalize the key)
    expect(result).toHaveLength(2);
    // After sorting alphabetically, spaces sort before letters
    expect(result[0].name).toBe('  Royal Queen Seeds  ');
    expect(result[0].strainCount).toBe(1);
    expect(result[1].name).toBe('Royal Queen Seeds');
    expect(result[1].strainCount).toBe(1);
  });

  it('should sort results alphabetically by breeder name', () => {
    const strains = [
      {
        strain: 'Strain Z',
        phenotype: 'default',
        key: 'sz|default',
        breeder: 'Zebra Genetics',
        breeder_logo: '',
      },
      {
        strain: 'Strain A',
        phenotype: 'default',
        key: 'sa|default',
        breeder: 'Apple Seeds',
        breeder_logo: '',
      },
      {
        strain: 'Strain M',
        phenotype: 'default',
        key: 'sm|default',
        breeder: 'Middle Breeders',
        breeder_logo: '',
      },
    ];

    const result = getUniqueBreeders(strains);
    expect(result.map((b) => b.name)).toEqual([
      'Apple Seeds',
      'Middle Breeders',
      'Zebra Genetics',
    ]);
  });

  it('should handle single strain with breeder', () => {
    const strains = [
      {
        strain: 'Single Strain',
        phenotype: 'v1',
        key: 'ss|v1',
        breeder: 'Lone Breeder',
        breeder_logo: '/logo.jpg',
      },
    ];

    const result = getUniqueBreeders(strains);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      name: 'Lone Breeder',
      logo: '/logo.jpg',
      strainCount: 1,
    });
  });

  it('should handle empty strain list', () => {
    const result = getUniqueBreeders([]);
    expect(result).toHaveLength(0);
  });

  it('should handle multiple different breeders', () => {
    const strains = [
      {
        strain: 'Strain 1',
        phenotype: 'default',
        key: 's1|default',
        breeder: 'Breeder A',
        breeder_logo: '/a.png',
      },
      {
        strain: 'Strain 2',
        phenotype: 'default',
        key: 's2|default',
        breeder: 'Breeder B',
        breeder_logo: '/b.png',
      },
      {
        strain: 'Strain 3',
        phenotype: 'default',
        key: 's3|default',
        breeder: 'Breeder C',
        breeder_logo: '/c.png',
      },
      {
        strain: 'Strain 4',
        phenotype: 'default',
        key: 's4|default',
        breeder: 'Breeder A',
        breeder_logo: '/a.png',
      },
    ];

    const result = getUniqueBreeders(strains);
    expect(result).toHaveLength(3);
    expect(result[0].name).toBe('Breeder A');
    expect(result[0].strainCount).toBe(2);
    expect(result[1].name).toBe('Breeder B');
    expect(result[1].strainCount).toBe(1);
    expect(result[2].name).toBe('Breeder C');
    expect(result[2].strainCount).toBe(1);
  });
});
