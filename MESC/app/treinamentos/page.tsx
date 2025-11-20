import React from 'react';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { ScrollView } from '@/components/ui/scroll-view';
import { TrainingCard } from '@/components/TrainingCard';
import { mockTrainings } from '@/data/mock-trainings';

export default function TreinamentosPage() {
    return (
        <Box className="flex-1 bg-background-50 h-full">
            <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
                <VStack className="p-4 space-y-6 max-w-4xl mx-auto w-full">
                    <VStack className="space-y-2">
                        <Text className="text-2xl font-bold text-typography-900">
                            Treinamentos Litúrgicos
                        </Text>
                        <Text className="text-typography-500">
                            Aprofunde seu conhecimento na liturgia e no ministério.
                        </Text>
                    </VStack>

                    <Box className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {mockTrainings.map((training) => (
                            <TrainingCard key={training.id} training={training} />
                        ))}
                    </Box>
                </VStack>
            </ScrollView>
        </Box>
    );
}
