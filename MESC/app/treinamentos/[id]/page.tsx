import React from 'react';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Image } from '@/components/ui/image';
import { ScrollView } from '@/components/ui/scroll-view';
import { Pressable } from '@/components/ui/pressable';
import { mockTrainings } from '@/data/mock-trainings';
import Link from 'next/link';

// Helper to simulate data fetching
async function getTraining(id: string) {
    return mockTrainings.find((t) => t.id === id);
}

export default async function TrainingDetailsPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const training = await getTraining(id);

    if (!training) {
        return (
            <Box className="flex-1 justify-center items-center">
                <Text>Treinamento não encontrado.</Text>
            </Box>
        );
    }

    return (
        <Box className="flex-1 bg-background-50 h-full">
            <ScrollView>
                <Box className="h-48 md:h-64 w-full relative bg-gray-200">
                    <Image
                        source={{ uri: training.imageUrl }}
                        alt={training.title}
                        className="w-full h-full object-cover opacity-90"
                    />
                    <Box className="absolute bottom-0 left-0 right-0 bg-black/50 p-4">
                        <Box className="max-w-4xl mx-auto w-full">
                            <Text className="text-white text-2xl font-bold">{training.title}</Text>
                        </Box>
                    </Box>
                </Box>

                <VStack className="p-4 space-y-6 max-w-4xl mx-auto w-full">
                    <Box>
                        <Text className="text-typography-700 leading-relaxed">
                            {training.description}
                        </Text>
                    </Box>

                    <VStack className="space-y-4">
                        <Text className="text-xl font-bold text-typography-900">Conteúdo do Curso</Text>

                        {training.modules.length === 0 ? (
                            <Text className="text-typography-500 italic">
                                Nenhum módulo disponível no momento.
                            </Text>
                        ) : (
                            training.modules.map((module) => (
                                <VStack key={module.id} className="bg-background-0 rounded-lg border border-outline-100 overflow-hidden">
                                    <Box className="bg-background-50 p-3 border-b border-outline-100">
                                        <Text className="font-semibold text-typography-800">{module.title}</Text>
                                    </Box>
                                    <VStack divider>
                                        {module.lessons.map((lesson, index) => (
                                            <Pressable key={lesson.id} className={`p-4 ${index !== module.lessons.length - 1 ? 'border-b border-outline-50' : ''} hover:bg-background-50 active:bg-background-100`}>
                                                <HStack className="justify-between items-center">
                                                    <HStack className="space-x-3 items-center">
                                                        <Box className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${lesson.completed ? 'border-green-500 bg-green-50' : 'border-outline-300'}`}>
                                                            {lesson.completed && <Box className="w-3 h-3 bg-green-500 rounded-full" />}
                                                        </Box>
                                                        <Text className={lesson.completed ? 'text-typography-500 line-through' : 'text-typography-800'}>
                                                            {lesson.title}
                                                        </Text>
                                                    </HStack>
                                                    <Text className="text-xs text-typography-400">{lesson.duration}</Text>
                                                </HStack>
                                            </Pressable>
                                        ))}
                                    </VStack>
                                </VStack>
                            ))
                        )}
                    </VStack>

                    <Box className="pt-4">
                        <Link href="/treinamentos" legacyBehavior>
                            <Pressable className="bg-outline-100 p-3 rounded-lg items-center active:bg-outline-200">
                                <Text className="text-typography-600 font-medium">Voltar para Lista</Text>
                            </Pressable>
                        </Link>
                    </Box>
                </VStack>
            </ScrollView>
        </Box>
    );
}
