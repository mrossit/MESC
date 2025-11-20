import React from 'react';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import Link from 'next/link';

export const Header = () => {
    return (
        <Box className="bg-white border-b border-outline-100 py-4 px-6 sticky top-0 z-50 shadow-sm">
            <HStack className="justify-between items-center max-w-6xl mx-auto w-full">
                <Link href="/" legacyBehavior>
                    <Pressable>
                        <Text className="text-xl font-bold text-primary-600">MESC</Text>
                    </Pressable>
                </Link>

                <HStack className="space-x-6">
                    <Link href="/" legacyBehavior>
                        <Pressable>
                            <Text className="text-typography-700 hover:text-primary-600 font-medium">Home</Text>
                        </Pressable>
                    </Link>
                    <Link href="/treinamentos" legacyBehavior>
                        <Pressable>
                            <Text className="text-typography-700 hover:text-primary-600 font-medium">Treinamentos</Text>
                        </Pressable>
                    </Link>
                </HStack>
            </HStack>
        </Box>
    );
};
